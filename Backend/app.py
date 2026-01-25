from flask import Flask, request, jsonify, send_file, session
from flask_cors import CORS
from bson.objectid import ObjectId
from bson.json_util import dumps
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import tempfile
import json
import uuid
from datetime import datetime
import pandas as pd
import re
import requests
import whois
import dns.resolver
from urllib.parse import urlparse, parse_qs
import joblib
import ssl
import socket
import shutil
from bs4 import BeautifulSoup
import pytesseract
from PyPDF2 import PdfReader
from PIL import Image
import cv2
import numpy as np
import torch
from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    AutoModelForVideoClassification,
)
import pickle
from androguard.core.apk import APK
from zipfile import BadZipFile
import tldextract
import ipaddress
from pymongo import MongoClient
import random
from twilio.rest import Client
import bcrypt
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# -------------------------------------------------------------------
# FLASK & BASIC CONFIG
# -------------------------------------------------------------------
app = Flask(__name__)

# Secret key for sessions
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "super-secret-dev-key")

# Allow cookies (sessions) from frontend origins
CORS(
    app,
    origins=["http://localhost:5173", "http://localhost:5173", "http://localhost:3000"],
    supports_credentials=True,
)

# For local dev you can keep Secure=False; for HTTPS set True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False

app.config["UPLOAD_FOLDER"] = "uploads"  # for evidence files
app.config["COMPLAINTS_FOLDER"] = "complaints_data"
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100 MB

REPORTS_FOLDER = "reports"

# Ensure folders exist (absolute paths)
uploads_abs = os.path.join(app.root_path, app.config["UPLOAD_FOLDER"])
reports_abs = os.path.join(app.root_path, REPORTS_FOLDER)
os.makedirs(uploads_abs, exist_ok=True)
os.makedirs(reports_abs, exist_ok=True)

# -------------------------------------------------------------------
# LOCAL LLM CONFIG (OLLAMA)
# -------------------------------------------------------------------
# Ollama should be serving in a separate terminal:
#   $env:OLLAMA_HOST="0.0.0.0:11434"
#   ollama serve
#
# From this backend we call it via localhost:
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
LOCAL_LLM_MODEL = os.environ.get("LOCAL_LLM_MODEL", "openai/gpt-3.5-turbo")


def call_local_llm(prompt, max_tokens=256):
    """
    Call the local Ollama chat API and return the assistant's reply text.

    - Smaller max_tokens so it finishes faster.
    - Higher timeout so the model has time to answer.
    """
    try:
        # Safety: trim extremely long prompts (just in case)
        if len(prompt) > 8000:
            prompt = prompt[:8000] + "\n\n[Prompt truncated due to length]\n"

        payload = {
            "model": LOCAL_LLM_MODEL,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "stream": False,
            "options": {
                # Limit generation length so it doesn't run forever
                "num_predict": max_tokens,
                # Lower context window used each call (helps memory & speed)
                "num_ctx": 2048,
            },
        }

        # Increase timeout so first call / heavy calls don't fail at 60s
        resp = requests.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload, timeout=180)

        if resp.status_code != 200:
            print("[LOCAL LLM] Error:", resp.status_code, resp.text[:300])
            return f"AI Error ({resp.status_code}): {resp.text[:200]}"

        data = resp.json()
        msg = data.get("message", {})
        content = msg.get("content", "").strip()
        if not content:
            return "AI response was empty."
        return content

    except requests.exceptions.ReadTimeout:
        print("[LOCAL LLM] Read timeout – model took too long to respond")
        return "AI Error: The local AI model took too long to respond (timeout). Try again with a simpler query."
    except Exception as e:
        print("[LOCAL LLM] Exception:", e)
        return f"AI Error: {str(e)[:200]}"


# -------------------------------------------------------------------
# TWILIO CONFIG
# -------------------------------------------------------------------
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")

# Only initialize Twilio client if credentials are provided
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
else:
    print("⚠️ Twilio credentials not set - SMS features will be disabled")

# -------------------------------------------------------------------
# MONGO SETUP
# -------------------------------------------------------------------
MONGO_URI = "mongodb://localhost:27017/"
MONGO_DB_NAME = "cybersecurity_portal"
MONGO_COLLECTION_NAME = "complaints"
MONGO_VOLUNTEERS_COLLECTION_NAME = "volunteers"

try:
    mongo_client = MongoClient(MONGO_URI)
    mongo_db = mongo_client[MONGO_DB_NAME]

    complaints_collection = mongo_db["complaints"]
    volunteers_collection = mongo_db["volunteers"]
    admin_collection = mongo_db["admin"]
    team_members_collection = mongo_db["team_members"]
    user_collection = mongo_db["users"]

    print(f"✅ MongoDB connected to database: {MONGO_DB_NAME}")
except Exception as e:
    print(f"❌ Error connecting to MongoDB: {e}")
    mongo_client = None
    complaints_collection = None
    volunteers_collection = None
    admin_collection = None
    team_members_collection = None
    user_collection = None

# -------------------------------------------------------------------
# BASIC UTILS
# -------------------------------------------------------------------
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


def generate_complaint_id():
    return f"CYB-{str(uuid.uuid4())[:8].upper()}"


def get_admin_from_request():
    """
    Admin auth helper:
    - Primary: reads admin_id from server-side session
    - Fallback: header 'X-Admin-Id' OR query param 'admin_id'
    """
    if admin_collection is None:
        return None

    admin_id = session.get("admin_id")

    # Fallbacks for compatibility (header or query)
    if not admin_id:
        admin_id = request.headers.get("X-Admin-Id") or request.args.get("admin_id")

    if not admin_id:
        return None

    try:
        admin = admin_collection.find_one({"_id": ObjectId(admin_id)})
        return admin
    except Exception:
        return None


# -------------------------------------------------------------------
# LOAD ML MODELS
# -------------------------------------------------------------------
phishing_model = None
apk_model = None
deepfake_image_model = None
deepfake_video_model = None
apk_features = None
X_cols = None


def load_ml_models():
    global phishing_model, apk_model, deepfake_image_model, deepfake_video_model, apk_features, X_cols

    try:
        phishing_model = joblib.load("phishing_rf_model.pkl")
        print("✅ Phishing model loaded")
    except Exception as e:
        print(f"❌ Error loading phishing model: {e}")

    try:
        with open("apk_model_evaluation.pkl", "rb") as f:
            apk_model = pickle.load(f)
        with open("apk_features.pkl", "rb") as f:
            apk_features = pickle.load(f)
        print("✅ APK model loaded")
    except Exception as e:
        print(f"❌ Error loading APK model: {e}")

    try:
        model_name = "dima806/deepfake_vs_real_image_detection"
        deepfake_image_model = AutoModelForImageClassification.from_pretrained(
            model_name
        )
        print("✅ Deepfake image model loaded")
    except Exception as e:
        print(f"❌ Error loading deepfake image model: {e}")

    # Commented out to speed up startup - uncomment if needed
    # try:
    #     video_model_name = "muneeb1812/videomae-base-fake-video-classification"
    #     deepfake_video_model = AutoModelForVideoClassification.from_pretrained(
    #         video_model_name
    #     )
    #     print("✅ Deepfake video model loaded")
    # except Exception as e:
    #     print(f"❌ Error loading deepfake video model: {e}")


load_ml_models()

# -------------------------------------------------------------------
# PHISHING DETECTOR
# -------------------------------------------------------------------
class MultiLibraryPhishingDetector:
    def __init__(self):
        self.trusted_domains = self._load_trusted_domains()
        self.suspicious_keywords = self._load_suspicious_keywords()
        self.legitimate_domains = self._load_legitimate_domains()

    def _load_trusted_domains(self):
        return {
            "government": [".gov", ".gov.in", ".mil", ".gov.uk", ".gov.au"],
            "education": [".edu", ".ac.in", ".ac.uk", ".edu.au", ".edu.cn"],
            "finance": [
                "paypal.com",
                "bankofamerica.com",
                "chase.com",
                "wellsfargo.com",
                "citibank.com",
                "americanexpress.com",
                "discover.com",
            ],
            "tech_giants": [
                "google.com",
                "microsoft.com",
                "apple.com",
                "amazon.com",
                "facebook.com",
                "twitter.com",
                "linkedin.com",
                "github.com",
            ],
        }

    def _load_suspicious_keywords(self):
        return {
            "urgency": ["urgent", "immediate", "act now", "limited time", "expires", "suspended"],
            "financial": [
                "verify account",
                "confirm identity",
                "update payment",
                "billing problem",
                "unusual activity",
                "refund",
                "claim",
                "prize",
                "winner",
            ],
            "credential": [
                "login",
                "signin",
                "password",
                "username",
                "credential",
                "authentication",
            ],
            "security": [
                "security alert",
                "compromised",
                "unauthorized",
                "locked",
                "blocked",
            ],
        }

    def _load_legitimate_domains(self):
        return {
            "hosting": [
                "github.io",
                "netlify.app",
                "vercel.app",
                "herokuapp.com",
                "azurewebsites.net",
                "appspot.com",
                "onrender.com",
            ],
            "cdn": ["cloudflare.com", "cloudfront.net", "akamai.net", "fastly.net"],
            "email": ["gmail.com", "outlook.com", "yahoo.com", "protonmail.com"],
        }

    def analyze_url_structure(self, url):
        parsed = urlparse(url)
        domain = parsed.netloc
        path = parsed.path

        scores = {
            "length_suspicious": 0,
            "special_chars": 0,
            "subdomain_count": 0,
            "path_depth": 0,
            "has_port": 0,
            "encoded_chars": 0,
            "suspicious_keywords": 0,
        }
        reasons = []

        # URL length
        if len(url) > 75:
            scores["length_suspicious"] = min((len(url) - 75) / 50, 1.0)
            reasons.append(f"Unusually long URL ({len(url)} chars)")

        special_chars = ["@", "|", "..", "///", "%20", "%00"]
        for char in special_chars:
            if char in url:
                scores["special_chars"] += 0.3
                reasons.append(f"Contains suspicious character: {char}")

        subdomain_count = domain.count(".") - 1
        if subdomain_count > 2:
            scores["subdomain_count"] = min(subdomain_count / 5, 1.0)
            reasons.append(f"Multiple subdomains ({subdomain_count})")

        path_depth = path.count("/")
        if path_depth > 5:
            scores["path_depth"] = min(path_depth / 10, 1.0)
            reasons.append(f"Deep path structure ({path_depth} levels)")

        if ":" in domain and not url.startswith("https://"):
            scores["has_port"] = 1.0
            reasons.append("Non-standard port usage")

        encoded_count = url.count("%")
        if encoded_count > 3:
            scores["encoded_chars"] = min(encoded_count / 10, 1.0)
            reasons.append(f"Multiple encoded characters ({encoded_count})")

        suspicious_keywords = [
            "login",
            "signin",
            "verify",
            "secure",
            "account",
            "update",
            "confirm",
            "password",
            "banking",
            "suspended",
            "locked",
        ]
        domain_lower = domain.lower()
        url_lower = url.lower()

        found_keywords = [kw for kw in suspicious_keywords if kw in domain_lower or kw in url_lower]
        if found_keywords:
            scores["suspicious_keywords"] = min(len(found_keywords) / 3, 1.0)
            reasons.append(f"Contains phishing keywords: {', '.join(found_keywords)}")

        total_score = sum(scores.values()) / len(scores)

        return {
            "score": total_score,
            "is_suspicious": total_score > 0.3,
            "reasons": reasons,
            "details": scores,
        }

    def analyze_domain_reputation(self, domain):
        results = {
            "age_days": None,
            "registrar": None,
            "creation_date": None,
            "expiry_date": None,
            "dns_records": {},
            "is_suspicious": False,
            "reasons": [],
        }

        try:
            w = whois.whois(domain)
            creation_date = w.creation_date
            if isinstance(creation_date, list):
                creation_date = creation_date[0]

            if creation_date:
                results["creation_date"] = str(creation_date)
                age = (datetime.now() - creation_date).days
                results["age_days"] = age

                if age < 30:
                    results["is_suspicious"] = True
                    results["reasons"].append(f"Very new domain ({age} days old)")
                elif age < 180:
                    results["reasons"].append(f"Relatively new domain ({age} days)")

            results["registrar"] = str(w.registrar) if w.registrar else "Unknown"
            results["expiry_date"] = str(w.expiration_date) if w.expiration_date else None

        except Exception as e:
            results["reasons"].append(f"WHOIS lookup failed: {str(e)}")

        try:
            for record_type in ["A", "MX", "TXT", "NS"]:
                try:
                    answers = dns.resolver.resolve(domain, record_type, lifetime=2)
                    results["dns_records"][record_type] = [str(r) for r in answers]
                except Exception:
                    results["dns_records"][record_type] = []

            if not results["dns_records"].get("MX"):
                results["reasons"].append("No MX (email) records found")

        except Exception as e:
            results["is_suspicious"] = True
            results["reasons"].append("DNS resolution failed")

        return results

    def analyze_ssl_certificate(self, domain):
        results = {
            "has_ssl": False,
            "issuer": None,
            "subject": None,
            "valid_from": None,
            "valid_until": None,
            "is_suspicious": False,
            "reasons": [],
        }

        try:
            context = ssl.create_default_context()
            with socket.create_connection((domain, 443), timeout=5) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    results["has_ssl"] = True
                    results["issuer"] = dict(x[0] for x in cert["issuer"])
                    results["subject"] = dict(x[0] for x in cert["subject"])
                    results["valid_from"] = cert["notBefore"]
                    results["valid_until"] = cert["notAfter"]

                    valid_from = datetime.strptime(cert["notBefore"], "%b %d %H:%M:%S %Y %Z")
                    cert_age = (datetime.now() - valid_from).days
                    if cert_age < 30:
                        results["is_suspicious"] = True
                        results["reasons"].append(f"Very new SSL certificate ({cert_age} days)")

                    issuer_org = results["issuer"].get("organizationName", "").lower()
                    if "let's encrypt" in issuer_org or "self-signed" in issuer_org:
                        results["reasons"].append("Free/Self-signed certificate (common in phishing)")

        except ssl.SSLError:
            results["is_suspicious"] = True
            results["reasons"].append("Invalid SSL certificate")
        except Exception as e:
            results["is_suspicious"] = True
            results["reasons"].append(f"No HTTPS support: {str(e)}")

        return results

    def analyze_page_content(self, url):
        results = {
            "title": None,
            "forms_count": 0,
            "iframes_count": 0,
            "external_links": 0,
            "suspicious_forms": False,
            "hidden_elements": 0,
            "is_suspicious": False,
            "reasons": [],
        }

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = requests.get(url, timeout=10, headers=headers, allow_redirects=True)

            if len(response.history) > 2:
                results["is_suspicious"] = True
                results["reasons"].append(f"Multiple redirects ({len(response.history)})")

            soup = BeautifulSoup(response.text, "html.parser")

            if soup.title:
                results["title"] = soup.title.string.strip()
                if any(
                    word in results["title"].lower()
                    for word in ["verify", "suspended", "locked", "urgent"]
                ):
                    results["reasons"].append("Suspicious keywords in title")

            forms = soup.find_all("form")
            results["forms_count"] = len(forms)

            for form in forms:
                if form.find("input", {"type": "password"}):
                    action = form.get("action", "")
                    if action and not action.startswith(urlparse(url).netloc):
                        results["suspicious_forms"] = True
                        results["reasons"].append("Form submits to external domain")

            iframes = soup.find_all("iframe")
            results["iframes_count"] = len(iframes)
            if len(iframes) > 3:
                results["is_suspicious"] = True
                results["reasons"].append(f"Excessive iframes ({len(iframes)})")

            hidden = soup.find_all(style=re.compile(r"display:\s*none|visibility:\s*hidden"))
            results["hidden_elements"] = len(hidden)
            if len(hidden) > 10:
                results["reasons"].append("Many hidden elements (potential cloaking)")

            links = soup.find_all("a", href=True)
            domain = urlparse(url).netloc
            external = [l for l in links if domain not in l["href"]]
            results["external_links"] = len(external)

        except Exception as e:
            results["reasons"].append(f"Content analysis failed: {str(e)}")

        return results

    def detect_typosquatting(self, domain):
        results = {
            "is_typosquatting": False,
            "similar_to": None,
            "technique": None,
            "confidence": 0.0,
            "reasons": [],
        }

        ext = tldextract.extract(domain)
        full_domain = domain.lower()
        domain_name = ext.domain.lower()
        subdomain = ext.subdomain.lower()

        popular_brands = [
            "google",
            "facebook",
            "amazon",
            "paypal",
            "microsoft",
            "apple",
            "netflix",
            "instagram",
            "twitter",
            "linkedin",
            "yahoo",
            "ebay",
            "walmart",
            "target",
            "bestbuy",
            "bankofamerica",
            "chase",
            "wells",
            "citibank",
            "americanexpress",
            "discover",
            "bank",
            "login",
            "signin",
            "secure",
            "account",
            "verify",
            "update",
        ]

        for brand in popular_brands:
            normalized_full = (
                full_domain.replace("0", "o")
                .replace("1", "l")
                .replace("3", "e")
                .replace("5", "s")
                .replace("8", "b")
            )
            normalized_domain = (
                domain_name.replace("0", "o")
                .replace("1", "l")
                .replace("3", "e")
                .replace("5", "s")
                .replace("8", "b")
            )
            normalized_subdomain = (
                subdomain.replace("0", "o")
                .replace("1", "l")
                .replace("3", "e")
                .replace("5", "s")
                .replace("8", "b")
            )

            if (
                brand in normalized_full
                or brand in normalized_domain
                or brand in normalized_subdomain
            ):
                if any(c in full_domain for c in ["0", "1", "3", "5", "8"]):
                    results["is_typosquatting"] = True
                    results["similar_to"] = brand
                    results["technique"] = "Character substitution (homograph)"
                    results["confidence"] = 0.95
                    results["reasons"].append(
                        f"Uses digit substitution to mimic '{brand}'"
                    )
                    break

                if brand in normalized_subdomain and domain_name not in popular_brands:
                    results["is_typosquatting"] = True
                    results["similar_to"] = brand
                    results["technique"] = "Suspicious subdomain"
                    results["confidence"] = 0.85
                    results["reasons"].append(
                        f"Uses '{brand}' in subdomain with unrelated domain"
                    )
                    break

                if brand in normalized_domain and domain_name != brand:
                    if "-" in domain_name or "login" in domain_name or "secure" in domain_name:
                        results["is_typosquatting"] = True
                        results["similar_to"] = brand
                        results["technique"] = "Brand + suspicious keyword"
                        results["confidence"] = 0.90
                        results["reasons"].append(
                            f"Combines '{brand}' with suspicious keywords"
                        )
                        break

        suspicious_tlds = [
            ".tk",
            ".ml",
            ".ga",
            ".cf",
            ".gq",
            ".xyz",
            ".top",
            ".work",
            ".click",
        ]
        if any(full_domain.endswith(tld) for tld in suspicious_tlds):
            for brand in popular_brands:
                if brand in full_domain:
                    results["is_typosquatting"] = True
                    results["similar_to"] = brand
                    results["technique"] = "Brand with suspicious TLD"
                    results["confidence"] = 0.80
                    results["reasons"].append(
                        "Uses suspicious TLD with brand name"
                    )
                    break

        return results

    def analyze_ip_address(self, domain):
        results = {
            "ip_address": None,
            "is_ip_url": False,
            "is_private": False,
            "is_suspicious": False,
            "reasons": [],
        }

        try:
            try:
                ip_obj = ipaddress.ip_address(domain)
                results["is_ip_url"] = True
                results["ip_address"] = str(ip_obj)
                results["is_suspicious"] = True
                results["reasons"].append("Using IP address instead of domain name")

                if ip_obj.is_private:
                    results["is_private"] = True
                    results["reasons"].append("Private IP address range")

                return results
            except Exception:
                pass

            ip_ = socket.gethostbyname(domain)
            results["ip_address"] = ip_

            ip_obj = ipaddress.ip_address(ip_)
            if ip_obj.is_private:
                results["is_private"] = True
                results["is_suspicious"] = True
                results["reasons"].append("Resolves to private IP")

        except Exception as e:
            results["reasons"].append(f"IP resolution failed: {str(e)}")

        return results

    def detect_malware_indicators(self, url):
        results = {
            "has_malware_extension": False,
            "has_suspicious_params": False,
            "file_extension": None,
            "is_suspicious": False,
            "reasons": [],
        }

        parsed = urlparse(url)
        path = parsed.path.lower()

        dangerous_exts = [
            ".exe",
            ".scr",
            ".bat",
            ".cmd",
            ".com",
            ".pif",
            ".vbs",
            ".js",
            ".jar",
            ".app",
            ".deb",
            ".rpm",
            ".dmg",
            ".pkg",
            ".msi",
            ".dll",
            ".sys",
            ".drv",
            ".bin",
            ".run",
            ".apk",
            ".zip",
            ".rar",
            ".7z",
        ]

        for ext in dangerous_exts:
            if path.endswith(ext):
                results["has_malware_extension"] = True
                results["file_extension"] = ext
                results["is_suspicious"] = True
                results["reasons"].append(f"Potentially dangerous file type: {ext}")
                break

        query_params = parse_qs(parsed.query)
        suspicious_params = ["download", "file", "exec", "cmd", "run", "install"]

        for param in suspicious_params:
            if param in query_params:
                results["has_suspicious_params"] = True
                results["reasons"].append(f"Suspicious parameter: {param}")

        return results

    def comprehensive_analysis(self, url):
        parsed = urlparse(url)
        domain = parsed.netloc

        url_analysis = self.analyze_url_structure(url)
        domain_analysis = self.analyze_domain_reputation(domain)
        ssl_analysis = self.analyze_ssl_certificate(domain)
        content_analysis = self.analyze_page_content(url)
        typosquatting = self.detect_typosquatting(domain)
        ip_analysis = self.analyze_ip_address(domain)
        malware_analysis = self.detect_malware_indicators(url)

        weights = {
            "url_structure": 0.15,
            "domain_age": 0.20,
            "ssl": 0.15,
            "content": 0.15,
            "typosquatting": 0.20,
            "ip": 0.10,
            "malware": 0.05,
        }

        risk_score = 0.0

        risk_score += url_analysis["score"] * weights["url_structure"]

        if domain_analysis["age_days"]:
            if domain_analysis["age_days"] < 30:
                risk_score += 1.0 * weights["domain_age"]
            elif domain_analysis["age_days"] < 180:
                risk_score += 0.5 * weights["domain_age"]
        else:
            risk_score += 0.3 * weights["domain_age"]

        if ssl_analysis["is_suspicious"] or not ssl_analysis["has_ssl"]:
            risk_score += 1.0 * weights["ssl"]

        if content_analysis["is_suspicious"] or content_analysis["suspicious_forms"]:
            risk_score += 1.0 * weights["content"]

        if typosquatting["is_typosquatting"]:
            risk_score += typosquatting["confidence"] * weights["typosquatting"]
            if typosquatting["confidence"] > 0.8:
                risk_score += 0.3

        if ip_analysis["is_suspicious"]:
            risk_score += 1.0 * weights["ip"]

        if malware_analysis["is_suspicious"]:
            risk_score += 1.0 * weights["malware"]

        risk_score = min(risk_score, 1.5)  # clamp

        verdict = self._calculate_verdict(
            risk_score,
            url,
            domain,
            domain_analysis,
            ssl_analysis,
            typosquatting,
            malware_analysis,
        )

        return {
            "url": url,
            "domain": domain,
            "risk_score": round(risk_score, 2),
            "verdict": verdict,
            "confidence": self._calculate_confidence(risk_score),
            "layers": {
                "url_structure": url_analysis,
                "domain_reputation": domain_analysis,
                "ssl_certificate": ssl_analysis,
                "page_content": content_analysis,
                "typosquatting": typosquatting,
                "ip_analysis": ip_analysis,
                "malware_indicators": malware_analysis,
            },
        }

    def _calculate_verdict(
        self,
        risk_score,
        url,
        domain,
        domain_analysis,
        ssl_analysis,
        typosquatting,
        malware_analysis,
    ):
        if malware_analysis["is_suspicious"]:
            return "CRITICAL_MALWARE_RISK"

        if typosquatting["is_typosquatting"]:
            return "CRITICAL_PHISHING"

        suspicious_patterns = [
            "login",
            "signin",
            "verify",
            "secure",
            "account",
            "update",
            "confirm",
        ]
        domain_lower = domain.lower()
        url_lower = url.lower()

        has_suspicious_keyword = any(
            keyword in domain_lower or keyword in url_lower for keyword in suspicious_patterns
        )

        ext = tldextract.extract(domain)
        tld = f".{ext.suffix}"

        is_trusted_domain = False

        if tld in self.trusted_domains["government"] + self.trusted_domains["education"]:
            if (
                ssl_analysis["has_ssl"]
                and domain_analysis.get("age_days", 0)
                and domain_analysis["age_days"] > 365
            ):
                is_trusted_domain = True

        for platform in self.legitimate_domains["hosting"]:
            if platform in domain and ssl_analysis["has_ssl"]:
                is_trusted_domain = True
                break

        if has_suspicious_keyword and not is_trusted_domain:
            if domain_analysis.get("age_days") and domain_analysis["age_days"] < 90:
                return "HIGH_RISK"
            elif not domain_analysis.get("age_days"):
                return "HIGH_RISK"

        if is_trusted_domain:
            return "TRUSTED"

        if risk_score >= 0.7:
            return "HIGH_RISK"
        elif risk_score >= 0.4:
            return "SUSPICIOUS"
        elif risk_score >= 0.2:
            return "MODERATE"
        else:
            return "SAFE"

    def _calculate_confidence(self, risk_score):
        if risk_score >= 0.7 or risk_score <= 0.2:
            return "HIGH"
        elif risk_score >= 0.5 or risk_score <= 0.3:
            return "MEDIUM"
        else:
            return "LOW"


detector = MultiLibraryPhishingDetector()


def extract_features_for_ml(url, X_cols):
    """Placeholder for ML feature extraction."""
    features = {}
    for col in X_cols:
        if col not in features:
            features[col] = 0
    return pd.DataFrame([features])[X_cols]


def analyze_url(url):
    """Enhanced URL analysis using multi-layer detector + optional ML model."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    try:
        analysis = detector.comprehensive_analysis(url)
        ml_prediction = None
        if phishing_model and X_cols is not None:
            try:
                feat = extract_features_for_ml(url, X_cols)
                prob = phishing_model.predict_proba(feat)[0][1]
                pred = 1 if prob > 0.5 else 0
                ml_prediction = {
                    "verdict": "phishing" if pred == 1 else "legitimate",
                    "probability": float(prob),
                }
            except Exception as e:
                ml_prediction = {"error": f"ML prediction failed: {str(e)}"}

        all_reasons = []
        for layer_name, layer_data in analysis["layers"].items():
            if isinstance(layer_data, dict) and "reasons" in layer_data:
                all_reasons.extend(layer_data["reasons"])

        final_verdict = analysis["verdict"]
        if final_verdict in [
            "CRITICAL_MALWARE_RISK",
            "CRITICAL_PHISHING",
            "HIGH_RISK",
        ]:
            final_verdict_mapped = "phishing"
        elif final_verdict in ["SUSPICIOUS", "MODERATE"]:
            final_verdict_mapped = "suspicious"
        else:
            final_verdict_mapped = "legitimate"

        return {
            "url": url,
            "domain": analysis["domain"],
            "final_verdict": final_verdict_mapped,
            "verdict_detailed": analysis["verdict"],
            "risk_score": analysis["risk_score"],
            "confidence": analysis["confidence"],
            "ml_prediction": ml_prediction,
            "layers": analysis["layers"],
            "all_reasons": all_reasons,
            "domain_analysis": {
                "Domain": analysis["domain"],
                "Has SSL": analysis["layers"]["ssl_certificate"]["has_ssl"],
                "Domain Age (days)": analysis["layers"]["domain_reputation"]["age_days"],
                "DNS Records": analysis["layers"]["domain_reputation"]["dns_records"],
                "Pass Domain Check": analysis["verdict"] in ["SAFE", "TRUSTED"],
            },
        }
    except Exception as e:
        return {"error": f"URL analysis failed: {str(e)}"}


# -------------------------------------------------------------------
# FILE ANALYZERS (DOCUMENT / IMAGE / VIDEO / APK)
# -------------------------------------------------------------------
def analyze_phishing_document(file_path, filename):
    try:
        text = ""
        if filename.lower().endswith(".pdf"):
            pdf_reader = PdfReader(file_path)
            for page in pdf_reader.pages:
                text += page.extract_text() or ""
        elif filename.lower().endswith((".png", ".jpg", ".jpeg")):
            pil_image = Image.open(file_path)
            opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
            denoised = cv2.medianBlur(gray, 5)
            thresh = cv2.threshold(
                denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )[1]
            text = pytesseract.image_to_string(thresh)

        urls = re.findall(r"https?://[^\s]+", text)
        url_reports = []

        for u in urls:
            analysis = analyze_url(u)
            url_reports.append(analysis)

        return {
            "extracted_text": text,
            "found_urls": urls,
            "url_reports": url_reports,
            "risk_level": "high"
            if any(
                r.get("final_verdict")
                in ["phishing", "HIGH_RISK_PHISHING", "MALWARE_DELIVERY_RISK"]
                for r in url_reports
            )
            else "low",
        }
    except Exception as e:
        return {"error": f"Document analysis failed: {str(e)}"}


def analyze_deepfake_image(file_path):
    if not deepfake_image_model:
        return {"error": "Deepfake image model not loaded"}

    try:
        image = Image.open(file_path).convert("RGB")
        image_processor = AutoImageProcessor.from_pretrained(
            "dima806/deepfake_vs_real_image_detection"
        )
        inputs = image_processor(images=image, return_tensors="pt")

        with torch.no_grad():
            outputs = deepfake_image_model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=1)
            predicted_class_idx = torch.argmax(probabilities, dim=1).item()

        predicted_label = deepfake_image_model.config.id2label[predicted_class_idx]
        confidence = probabilities[0, predicted_class_idx].item()

        return {
            "prediction": predicted_label,
            "confidence": confidence,
            "is_deepfake": predicted_label.lower() != "real",
        }
    except Exception as e:
        return {"error": f"Image analysis failed: {str(e)}"}


def analyze_deepfake_video(file_path):
    if not deepfake_video_model:
        return {"error": "Deepfake video model not loaded"}

    NUM_FRAMES = 16
    try:
        cap = cv2.VideoCapture(file_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        if total_frames < NUM_FRAMES:
            return {"error": f"Video too short. Needs at least {NUM_FRAMES} frames"}

        frames = []
        frame_indices = np.linspace(0, total_frames - 1, NUM_FRAMES, dtype=np.int32)

        for i in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if ret:
                frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

        cap.release()

        video_processor = AutoImageProcessor.from_pretrained(
            "muneeb1812/videomae-base-fake-video-classification"
        )
        inputs = video_processor(images=frames, return_tensors="pt")

        with torch.no_grad():
            outputs = deepfake_video_model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=1)
            predicted_class_idx = torch.argmax(probabilities, dim=1).item()

        predicted_label = deepfake_video_model.config.id2label[predicted_class_idx]
        confidence = probabilities[0, predicted_class_idx].item()

        return {
            "prediction": predicted_label,
            "confidence": confidence,
            "is_deepfake": predicted_label.lower() != "real",
        }
    except Exception as e:
        return {"error": f"Video analysis failed: {str(e)}"}


def create_feature_vector(apk_permissions, apk_features_list):
    feature_vector = np.zeros(len(apk_features_list))
    for permission in apk_permissions:
        try:
            index = apk_features_list.index(permission)
            feature_vector[index] = 1
        except ValueError:
            pass
    return feature_vector


def get_guidance_and_severity(probability):
    if probability < 0.3:
        return "Low", "Application appears safe."
    elif probability < 0.7:
        return "Moderate", "Application is suspicious. Recommend caution."
    else:
        return "High", "Highly malicious application. Do not install."


def analyze_apk(file_path):
    if not apk_model or not apk_features:
        return {"error": "APK model not loaded"}

    try:
        try:
            apk_obj = APK(file_path)
        except BadZipFile as e:
            return {
                "error": f"APK file is corrupted or not a valid ZIP structure: {str(e)}"
            }

        permissions = apk_obj.get_permissions()
        feature_vector = create_feature_vector(permissions, apk_features)
        malware_probability = apk_model.predict_proba([feature_vector])[0][1]
        severity, guidance = get_guidance_and_severity(malware_probability)

        return {
            "app_name": apk_obj.get_app_name(),
            "package": apk_obj.get_package(),
            "permissions": permissions,
            "malware_probability": float(malware_probability),
            "severity": severity,
            "guidance": guidance,
        }
    except Exception as e:
        return {"error": f"APK analysis failed: {str(e)}"}


# -------------------------------------------------------------------
# RISK LEVEL & AI HELPERS
# -------------------------------------------------------------------
def determine_risk_level(analysis_results):
    risk_score = 0

    if "url_analysis" in analysis_results:
        verdict = analysis_results["url_analysis"].get("verdict_detailed")
        if verdict in ["CRITICAL_PHISHING", "CRITICAL_MALWARE_RISK"]:
            risk_score += 4
        elif verdict == "HIGH_RISK":
            risk_score += 3
        elif verdict in ["SUSPICIOUS", "MODERATE"]:
            risk_score += 2

    if "phishing_document" in analysis_results:
        doc_analysis = analysis_results["phishing_document"]
        if any(
            report.get("verdict_detailed")
            in ["CRITICAL_PHISHING", "CRITICAL_MALWARE_RISK", "HIGH_RISK"]
            for report in doc_analysis.get("url_reports", [])
        ):
            risk_score += 3

    for result in analysis_results.values():
        if isinstance(result, dict):
            if result.get("is_deepfake"):
                risk_score += 2
            elif result.get("severity") == "High":
                risk_score += 3
            elif result.get("severity") == "Moderate":
                risk_score += 2

    if risk_score >= 3:
        return "high"
    elif risk_score >= 1:
        return "medium"
    else:
        return "low"


def get_ai_summary(complaint_data):
    """Generate a short summary of the case for admin/team dashboards using local LLM."""
    attack_type = complaint_data.get("attack_type", "N/A")
    risk_level = complaint_data.get("risk_level", "low")
    scenario = complaint_data.get("scenario", "No scenario given.")

    summary_prompt = f"""
    The following is a cybersecurity complaint. Provide a concise, professional summary
    (maximum 2-3 short sentences) of the CORE ISSUE and the AUTOMATED VERDICT
    for the Dashboard.

    Format: [TYPE] - [RISK]. Core: [Summary of the immediate threat]. Verdict: [Final Analysis Verdict].

    Incident Type: {attack_type}
    Risk Level: {risk_level.upper()}
    User Scenario: {scenario}

    Example Output:
    PHISHING - HIGH. Core: User clicked a link in a suspicious email. Verdict: Typosquatting detected, High-Risk URL.
    """

    return call_local_llm(summary_prompt, max_tokens=150)


def get_ai_assistance(attack_type, scenario, analysis_results):
    """Generate AI assistance based on attack type and analysis results using local LLM."""

    prompt = ""

    # Logic for APK analysis
    if attack_type == "malware" and "apk_analysis" in analysis_results:
        apk_info = analysis_results["apk_analysis"]
        probability = apk_info.get("malware_probability", 0)
        app_name = apk_info.get("app_name", "an application")

        if probability < 0.3:
            prompt = f"""
Based on the analysis, the file you submitted, "{app_name}", appears to be safe with a low malware
probability of {(probability * 100):.2f}%.

Provide a positive and reassuring message to the user. Explain that the application seems harmless.
Then, offer some general, proactive advice for maintaining security, such as:
- Only download apps from official app stores.
- Always check app permissions before installation.
- Keep your device's operating system and apps updated.
- Use a reliable antivirus program.
- Mention that they can close the case as the application seems safe.
"""
        else:
            prompt = f"""
The file you submitted, "{app_name}", is a security risk with a malware probability of {(probability * 100):.2f}%.

Provide a clear, step-by-step guide on how to:
1. Immediately mitigate the risk (e.g., uninstall the app, disconnect from the internet).
2. Safely remove the app and run a security scan.
3. Protect themselves in the future (e.g., be cautious with third-party APKs, enable two-factor authentication).
4. Mention the option to close the case once they are comfortable.
"""

    # Logic for Phishing analysis (URL or Document)
    elif attack_type == "phishing":
        has_phishing_url = False

        # Check URL analysis directly
        if "url_analysis" in analysis_results:
            verdict = analysis_results["url_analysis"].get("verdict_detailed")
            if verdict in [
                "CRITICAL_PHISHING",
                "CRITICAL_MALWARE_RISK",
                "HIGH_RISK",
            ]:
                has_phishing_url = True
            elif analysis_results["url_analysis"].get("final_verdict") == "phishing":
                has_phishing_url = True

        # Check phishing document analysis and its contained URLs
        if "phishing_document" in analysis_results:
            if analysis_results["phishing_document"].get("risk_level") == "high":
                has_phishing_url = True

        if has_phishing_url:
            prompt = """
The analysis of the submitted URL or document has identified one or more malicious or high-risk phishing links.

Provide a clear, step-by-step guide on how to:
1. DO NOT click on or visit the detected URLs.
2. If you have already clicked on a link, immediately change passwords for any accounts you may have accessed.
3. Run a full security scan on your device immediately.
4. Explain how to identify phishing links in the future (check the domain name closely, look for generic messages).
5. Advise on reporting the phishing attempt to the relevant authorities or service providers (e.g., Google Safe Browsing, the bank being impersonated).
"""
        else:
            prompt = """
The analysis of the submitted URL or document did not detect any clear malicious activity. The file/URL appears
to be safe, but vigilance is always necessary.

Provide a reassuring message and proactive advice, such as:
- Be cautious with links from unknown sources, even if they pass automated checks.
- Verify the authenticity of documents and their senders (e.g., call the company using a known number).
- Use strong, unique passwords and enable Two-Factor Authentication (2FA).
- Explain the importance of ongoing vigilance.
"""

    # Deepfake logic
    elif attack_type.startswith("deepfake"):
        is_deepfake = analysis_results.get("deepfake_image", {}).get(
            "is_deepfake"
        ) or analysis_results.get("deepfake_video", {}).get("is_deepfake")

        if is_deepfake:
            prompt = """
The submitted media (image/video) has been flagged as a Deepfake with high confidence.

Provide a clear, urgent guide on how to handle this malicious media:
1. DO NOT share the media further. Sharing it spreads the deception.
2. Warn the original source (the person/organization the media claims to be from) that their identity has been compromised.
3. Report the media to the platform where it was posted (e.g., social media, chat app) for impersonation/misinformation.
4. Explain that Deepfakes are used for fraud, blackmail, and defamation.
5. Advise the user to verify information using official communication channels only.
"""
        else:
            prompt = """
The submitted media (image/video) analysis suggests it is Real (not a deepfake).

Provide a reassuring message. Offer advice for media authenticity verification in the future, such as:
- Always be skeptical of unexpected media.
- Cross-reference the content with trusted news sources.
- Use reverse image search tools to check for origin.
"""

    # Generic prompt for other attack types or if no specific analysis applies
    else:
        prompt = f"""
Based on the following cybersecurity incident report, provide real-time, actionable advice to help the user
resolve the issue and prevent future attacks.

Incident Type: {attack_type}
User Scenario: {scenario}
Technical Analysis: {json.dumps(analysis_results, indent=2)}

The advice should be a clear step-by-step guide on how to:
1. Immediately mitigate the attack (e.g., disconnect from the internet, change passwords).
2. Overcome the current problem (e.g., remove malware, report fraud).
3. Protect themselves in the future.
4. Mention the option to close the case once they are comfortable.
"""

    # Use smaller max_tokens than before to avoid timeouts
    return call_local_llm(prompt, max_tokens=512)


# -------------------------------------------------------------------
# EVIDENCE FILE VIEW/DOWNLOAD (ADMIN ONLY)
# -------------------------------------------------------------------
@app.route("/api/admin/evidence/<complaint_id>/<unique_filename>", methods=["GET"])
def get_evidence_file(complaint_id, unique_filename):
    """
    Secure evidence fetch for admin:
    - Admin must be logged in (session-based).
    - Confirms file belongs to that complaint.
    - Uses stored file_path (relative 'uploads/...') and resolves to absolute.
    """
    admin = get_admin_from_request()
    if not admin:
        print("[EVIDENCE] Unauthorized access attempt")
        return jsonify({"error": "Unauthorized"}), 401

    print(
        f"[EVIDENCE] Admin {admin.get('_id')} requested file {unique_filename} for complaint {complaint_id}"
    )

    if complaints_collection is None:
        return jsonify({"error": "DB not available"}), 500

    complaint = complaints_collection.find_one({"complaint_id": complaint_id})
    if not complaint:
        print("[EVIDENCE] Complaint not found")
        return jsonify({"error": "Complaint not found"}), 404

    evidence_files = complaint.get("evidence_files", [])
    file_meta = next(
        (f for f in evidence_files if f.get("unique_filename") == unique_filename), None
    )

    if not file_meta:
        print(
            "[EVIDENCE] File not found in complaint. Known:",
            [f.get("unique_filename") for f in evidence_files],
        )
        return jsonify({"error": "File not found for this complaint"}), 404

    # Prefer stored file_path (relative) if present
    rel_path = file_meta.get("file_path") or os.path.join(
        app.config["UPLOAD_FOLDER"], unique_filename
    )
    if not os.path.isabs(rel_path):
        file_path = os.path.join(app.root_path, rel_path)
    else:
        file_path = rel_path

    print("[EVIDENCE] Resolved file path:", file_path)

    if not os.path.isfile(file_path):
        print("[EVIDENCE] File missing on disk")
        return jsonify({"error": "File missing on server"}), 404

    try:
        # Note: as_attachment=False = open in browser; frontend can set download attr if needed.
        return send_file(file_path, as_attachment=False)
    except Exception as e:
        print("Error sending file:", e)
        return jsonify({"error": "Error sending file"}), 500


# -------------------------------------------------------------------
# QUICK ANALYSERS (URL/APK/EMAIL, no DB save)
# -------------------------------------------------------------------
@app.route("/api/url-analyser", methods=["POST"])
def quick_url_analyser():
    """Analyzes URL and provides AI guidance without saving to MongoDB."""
    try:
        data = request.get_json()
        url = data.get("url")
        if not url:
            return jsonify({"success": False, "error": "URL is required."}), 400

        analysis_results = {"url_analysis": analyze_url(url)}
        ai_suggestion = get_ai_assistance(
            "phishing", f"User submitted URL: {url}", analysis_results
        )

        url_report = analysis_results["url_analysis"]

        return jsonify(
            {
                "success": True,
                "url": url_report["url"],
                "final_verdict": url_report["final_verdict"],
                "risk_score": url_report["risk_score"],
                "ai_suggestion": ai_suggestion,
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/apk-analyser", methods=["POST"])
def quick_apk_analyser():
    """Analyzes APK file and provides AI guidance without saving to MongoDB."""

    if "file" not in request.files:
        return jsonify({"success": False, "error": "No APK file uploaded."}), 400

    file = request.files["file"]

    if not file.filename.lower().endswith(".apk"):
        return (
            jsonify({"success": False, "error": "Invalid file type. Must be APK."}),
            400,
        )

    global apk_model, apk_features
    if apk_model is None or apk_features is None:
        return (
            jsonify(
                {
                    "success": False,
                    "error": "APK ML models are not loaded. Please check model files (apk_model_evaluation.pkl, apk_features.pkl).",
                }
            ),
            500,
        )

    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, secure_filename(file.filename))

    try:
        file.save(temp_path)
        analysis_results = {"apk_analysis": analyze_apk(temp_path)}
        apk_report = analysis_results["apk_analysis"]

        if "error" in apk_report:
            raise Exception(apk_report["error"])

        ai_suggestion = get_ai_assistance(
            "malware",
            f"User submitted APK: {apk_report.get('app_name', 'Unknown App')}",
            analysis_results,
        )

        return jsonify(
            {
                "success": True,
                "app_name": apk_report.get("app_name", "N/A"),
                "package": apk_report.get("package", "N/A"),
                "severity": apk_report.get("severity", "Low"),
                "malware_probability": apk_report.get("malware_probability", 0.0),
                "guidance": apk_report.get("guidance", "Analysis Complete."),
                "ai_suggestion": ai_suggestion,
            }
        )

    except Exception as e:
        error_message = f"APK Analysis Failed: {str(e)}"
        print(f"❌ Critical APK Error: {error_message}")
        return jsonify({"success": False, "error": error_message}), 500

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)


@app.route("/api/email-analyser", methods=["POST"])
def quick_email_analyser():
    """Analyzes email/document/image and provides AI guidance without saving to MongoDB."""
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No document file uploaded."}), 400

    file = request.files["file"]
    filename = secure_filename(file.filename)

    if not filename.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Invalid file type. Must be PDF, PNG, JPG, or JPEG.",
                }
            ),
            400,
        )

    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, filename)
    file.save(temp_path)

    try:
        analysis_results = {
            "phishing_document": analyze_phishing_document(temp_path, filename)
        }
        doc_report = analysis_results["phishing_document"]

        scenario = f"User received a suspicious document/image '{filename}' with text extracted: {doc_report['extracted_text'][:200]}"
        ai_suggestion = get_ai_assistance("phishing", scenario, analysis_results)

        return jsonify(
            {
                "success": True,
                "filename": filename,
                "risk_level": doc_report["risk_level"],
                "urls_found": doc_report["found_urls"],
                "url_reports": doc_report["url_reports"],
                "ai_suggestion": ai_suggestion,
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)


# -------------------------------------------------------------------
# SUBMIT CYB COMPLAINT (SAVES TO MONGO + FILES)
# -------------------------------------------------------------------
@app.route("/api/submit_complaint", methods=["POST"])
def submit_complaint():
    if complaints_collection is None:
        return jsonify({"success": False, "error": "Database connection failed."}), 500

    try:
        print("✅ Request received at /api/submit_complaint endpoint.")

        user_info = {
            "name": request.form.get("name"),
            "email": request.form.get("email"),
            "phone": request.form.get("phone"),
            "address": request.form.get("address"),
        }

        attack_type = request.form.get("attack_type")
        scenario = request.form.get("scenario")
        additional_info = request.form.get("additional_info", "")
        complaint_id = generate_complaint_id()
        analysis_results = {}
        evidence_files = []

        # 1. Handle file uploads
        if "evidence" in request.files:
            files = request.files.getlist("evidence")
            temp_dir = tempfile.mkdtemp()

            for file in files:
                if file.filename != "":
                    filename = secure_filename(file.filename)
                    unique_filename = f"{complaint_id}_{filename}"

                    final_path = os.path.join(uploads_abs, unique_filename)
                    temp_path = os.path.join(temp_dir, unique_filename)
                    file.save(temp_path)

                    # Relative path stored in Mongo (uploads/...)
                    db_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_filename)

                    evidence_files.append(
                        {
                            "filename": filename,
                            "unique_filename": unique_filename,
                            "file_path": db_path,
                        }
                    )

                    print(f"File saved temporarily: {temp_path}")

                    # File-type specific analysis
                    low = filename.lower()
                    if (
                        attack_type == "phishing"
                        and low.endswith((".pdf", ".png", ".jpg", ".jpeg"))
                    ):
                        analysis_results["phishing_document"] = (
                            analyze_phishing_document(temp_path, filename)
                        )
                    elif (
                        attack_type == "deepfake_image"
                        and low.endswith((".png", ".jpg", ".jpeg"))
                    ):
                        analysis_results["deepfake_image"] = analyze_deepfake_image(
                            temp_path
                        )
                    elif attack_type == "deepfake_video" and low.endswith(
                        (".mp4", ".avi", ".mov", ".mkv")
                    ):
                        analysis_results["deepfake_video"] = analyze_deepfake_video(
                            temp_path
                        )
                    elif attack_type == "malware" and low.endswith(".apk"):
                        analysis_results["apk_analysis"] = analyze_apk(temp_path)

                    # Move file from temp to final upload folder
                    try:
                        shutil.move(temp_path, final_path)
                        print(f"Moved file to final path: {final_path}")
                    except Exception as move_err:
                        print(
                            f"Error moving file from {temp_path} to {final_path}: {move_err}"
                        )
                        raise

            try:
                os.rmdir(temp_dir)
            except OSError as e:
                print(f"Warning: Could not remove temporary directory {temp_dir}: {e}")

        # 2. URL-specific analysis
        if attack_type == "phishing" and request.form.get("url"):
            analysis_results["url_analysis"] = analyze_url(request.form.get("url"))

        print(f"Final Analysis Results: {analysis_results}")

        # 3. Risk + AI assistance
        risk_level = determine_risk_level(analysis_results)
        ai_assistance = get_ai_assistance(attack_type, scenario, analysis_results)

        # 4. Prepare Mongo document
        complaint_data = {
            "complaint_id": complaint_id,
            "user_info": user_info,
            "attack_type": attack_type,
            "scenario": scenario,
            "additional_info": additional_info,
            "evidence_files": evidence_files,
            "analysis_results": analysis_results,
            "ai_assistance": ai_assistance,
            "risk_level": risk_level,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "last_updated": datetime.utcnow(),
        }

        # Short summary used by admin + team dashboards
        complaint_data["ai_summary"] = get_ai_summary(complaint_data)

        result = complaints_collection.insert_one(complaint_data)
        print(
            f"✅ Complaint {complaint_id} saved successfully to MongoDB ID: {result.inserted_id}"
        )

        return jsonify(
            {
                "success": True,
                "complaint_id": complaint_id,
                "ai_assistance": ai_assistance,
                "risk_level": risk_level,
                "analysis_results": analysis_results,
            }
        )

    except Exception as e:
        print(f"❌ Error during complaint submission: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------------
# GET SINGLE COMPLAINT (ADMIN VIEW)
# -------------------------------------------------------------------
@app.route("/api/get_complaint/<complaint_id>")
def get_complaint(complaint_id):
    if complaints_collection is None:
        return jsonify({"success": False, "error": "Database connection failed."}), 500

    try:
        complaint = complaints_collection.find_one({"complaint_id": complaint_id})

        if complaint:
            complaint["_id"] = str(complaint["_id"])
            for date_field in ["submitted_at", "created_at", "last_updated"]:
                if date_field in complaint and complaint[date_field]:
                    if isinstance(complaint[date_field], datetime):
                        complaint[date_field] = complaint[date_field].isoformat()

            daily_updates = complaint.get("daily_updates", [])
            completion_report = complaint.get("completion_report")

            response = {
                "mongo_id": complaint["_id"],
                "complaint_id": complaint.get("complaint_id"),
                "status": complaint.get("status", "pending"),
                "category": complaint.get("category"),
                "risk_level": complaint.get("risk_level"),
                "attack_type": complaint.get("attack_type"),
                "scenario": complaint.get("scenario"),
                "additional_info": complaint.get("additionalInfo")
                or complaint.get("additional_info"),
                "daily_updates": daily_updates,
                "completion_report": completion_report,
                "user_info": complaint.get("user_info", {}),
                "evidence_files": complaint.get("evidence_files", []),
                "analysis_results": complaint.get("analysis_results", {}),
                "ai_assistance": complaint.get("ai_assistance"),
                "ai_summary": complaint.get("ai_summary"),
                "submitted_at": complaint.get("submitted_at"),
                "created_at": complaint.get("created_at"),
                "last_updated": complaint.get("last_updated"),
            }

            return jsonify({"success": True, "complaint": response})

        else:
            return jsonify({"success": False, "error": "Complaint not found"}), 404

    except Exception as e:
        print(f"❌ Error retrieving complaint from MongoDB: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------------
# GET ALL COMPLAINTS (ADMIN DASHBOARD SUMMARY)
# -------------------------------------------------------------------
@app.route("/api/admin/complaints")
def get_all_complaints():
    if complaints_collection is None:
        return jsonify({"success": False, "error": "Database connection failed."}), 500
    try:
        projection = {
            "_id": 0,
            "analysis_results": 0,
            "ai_assistance": 0,
            "admin_notes": 0,
            "evidence_files": 0,
        }

        complaints_cursor = complaints_collection.find({}, projection).sort(
            "created_at", -1
        )

        complaints = []
        for complaint in complaints_cursor:
            if "created_at" in complaint and isinstance(
                complaint["created_at"], datetime
            ):
                complaint["created_at"] = complaint["created_at"].isoformat()
            if "last_updated" in complaint and isinstance(
                complaint["last_updated"], datetime
            ):
                complaint["last_updated"] = complaint["last_updated"].isoformat()
            complaints.append(complaint)

        return jsonify({"success": True, "complaints": complaints})
    except Exception as e:
        print(f"❌ Error fetching complaints from MongoDB: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/admin/update_status", methods=["POST"])
def update_complaint_status():
    if complaints_collection is None:
        return jsonify({"success": False, "error": "Database connection failed."}), 500
    try:
        data = request.get_json()
        complaint_id = data.get("complaint_id")
        new_status = data.get("status")
        admin_notes = data.get("admin_notes", "")

        update_result = complaints_collection.update_one(
            {"complaint_id": complaint_id},
            {
                "$set": {
                    "status": new_status,
                    "admin_notes": admin_notes,
                    "last_updated": datetime.utcnow(),
                }
            },
        )

        if update_result.matched_count == 1:
            return jsonify({"success": True})
        else:
            return jsonify({"success": False, "error": "Complaint not found"}), 404

    except Exception as e:
        print(f"❌ Error updating status in MongoDB: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------------
# CHAT AI GUIDANCE (USED BY TEAM CHATBOT)
# -------------------------------------------------------------------
@app.route("/api/get_ai_guidance", methods=["POST"])
def get_ai_guidance():
    """
    TeamChatAssistant.jsx calls this with:
    {
      "attack_type": "...",
      "question": "...",
      "complaint_id": "CYB-XXXX..."
    }

    Response shape:
    { "success": true, "guidance": "..." }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No JSON data received"}), 400

        attack_type = data.get("attack_type", "general")
        user_question = data.get("question", "")
        complaint_id = data.get("complaint_id", "")

        context = ""
        if complaint_id and complaints_collection is not None:
            complaint = complaints_collection.find_one(
                {"complaint_id": complaint_id},
                {
                    "scenario": 1,
                    "analysis_results": 1,
                    "risk_level": 1,
                    "attack_type": 1,
                    "_id": 0,
                },
            )
            if complaint:
                context = f"""
Case ID: {complaint_id}
Attack Type: {complaint.get('attack_type')}
Risk Level: {complaint.get('risk_level')}
Scenario: {complaint.get('scenario')}
Analysis Results: {json.dumps(complaint.get('analysis_results', {}), indent=2)}
"""

        prompt = f"""
You are a cybersecurity investigator assistant helping a police/cyber team handle a real case.

Context:
{context}

Team question: {user_question}

Requirements:
- Answer in clear, numbered steps or bullet points.
- Mention any next best actions the team should do (evidence to collect, user to contact, reports to file).
- Be concise but practical. Avoid generic theory; focus on THIS case context.
"""

        ai_response = call_local_llm(prompt, max_tokens=256)
        return jsonify({"success": True, "guidance": ai_response})

    except Exception as e:
        print("[AI CHAT] Exception:", e)
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------------
# OTP SYSTEM (TWILIO)
# -------------------------------------------------------------------
otp_storage = {}  # phone: otp
otp_verified = {}  # phone: True if verified


def generate_otp():
    return str(random.randint(100000, 999999))


@app.route("/send-otp", methods=["POST"])
def send_otp():
    try:
        data = request.get_json()
        phone = data.get("phone")
        if not phone:
            return (
                jsonify(
                    {"status": "error", "message": "Phone number required"}
                ),
                400,
            )
        if not phone.startswith("+"):
            phone = "+91" + phone.strip()

        otp = generate_otp()
        otp_storage[phone] = otp
        print(f"🔐 Generated OTP for {phone}: {otp}")
        print(f"⚠️  DEVELOPMENT MODE: Copy this OTP -> {otp}")

        # Try to send SMS, but continue even if it fails (for development)
        try:
            message = twilio_client.messages.create(
                body=f"Your OTP for complaint verification is {otp} from Kongunadu Team, Six Strangers.",
                from_=TWILIO_PHONE_NUMBER,
                to=phone,
            )
            print(f"✅ Twilio SID: {message.sid}")
        except Exception as twilio_error:
            print(f"⚠️  Twilio SMS failed (trial account): {twilio_error}")
            print(f"💡 Using console OTP for development: {otp}")

        return jsonify(
            {"status": "success", "message": "OTP sent successfully", "dev_otp": otp}
        )
    except Exception as e:
        print("Error sending OTP:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/verify-otp", methods=["POST"])
def verify_otp():
    try:
        data = request.get_json()
        phone = data.get("phone")
        otp = data.get("otp")
        if not phone or not otp:
            return (
                jsonify(
                    {
                        "verified": False,
                        "message": "Phone and OTP required",
                    }
                ),
                400,
            )
        if not phone.startswith("+"):
            phone = "+91" + phone.strip()

        stored_otp = otp_storage.get(phone)
        if stored_otp == otp:
            otp_verified[phone] = True
            del otp_storage[phone]
            return jsonify({"verified": True})
        else:
            return jsonify({"verified": False, "message": "Invalid OTP"}), 400
    except Exception as e:
        print("Error verifying OTP:", e)
        return jsonify({"verified": False, "message": str(e)}), 500


# -------------------------------------------------------------------
# WOMEN COMPLAINT (CMP) WITH LEGAL AI (LOCAL LLM)
# -------------------------------------------------------------------
def analyze_complaint_with_ai(form_data):
    complaint_text = form_data.get("complaintText", "")
    category = form_data.get("category", "")
    additional_info = form_data.get("additionalInfo", "")

    prompt = f"""
You are a legal assistant familiar with Indian laws (IPC, POCSO, CrPC).
Analyze the following complaint and return only valid JSON, as an array of objects.

Each object should have:
- act: Name of the act (e.g., IPC, POCSO, CrPC)
- sections: List of section numbers (as strings)
- description: Short description

Example:
[
  {{"act": "IPC", "sections": ["375","376","376D"], "description": "Rape / Gang Rape"}},
  {{"act": "IPC", "sections": ["323","325"], "description": "Grievous bodily injury"}},
  {{"act": "CrPC", "sections": ["154"], "description": "FIR Registration"}}
]

Now analyze:

Complaint Category: {category}
Additional Info: {additional_info}
Complaint Text: {complaint_text}

Return only the JSON array, nothing else.
"""

    try:
        ai_text = call_local_llm(prompt, max_tokens=256)

        # Try to extract the first JSON array from the response
        match = re.search(r"\[.*\]", ai_text, re.DOTALL)
        if match:
            acts_json = match.group()
            acts = json.loads(acts_json)
        else:
            acts = [
                {
                    "act": "IPC",
                    "sections": ["375", "376", "376D"],
                    "description": "Rape / Gang Rape",
                }
            ]

        return acts

    except Exception as e:
        print("[LEGAL AI] Exception:", e)
        return [
            {
                "act": "IPC",
                "sections": ["375", "376", "376D"],
                "description": "Rape / Gang Rape",
            }
        ]


@app.route("/submit-complaint-women", methods=["POST"])
def submit_complaint_women():
    if complaints_collection is None:
        return jsonify({"status": "error", "message": "DB error"}), 500

    data = request.json
    phone = data.get("phone")
    if not phone:
        return (
            jsonify({"status": "error", "message": "Phone number is required"}),
            400,
        )
    if not phone.startswith("+"):
        phone = "+91" + phone

    if otp_verified.get(phone) != True:
        return (
            jsonify({"status": "error", "message": "OTP not verified yet"}),
            400,
        )

    complaint_id = f"CMP-{int(datetime.timestamp(datetime.now()))}"
    data["complaint_id"] = complaint_id
    data["submitted_at"] = datetime.now()
    data["status"] = "pending"

    result = complaints_collection.insert_one(data)

    acts = analyze_complaint_with_ai(data)

    otp_verified.pop(phone, None)

    return jsonify(
        {
            "status": "success",
            "message": "Complaint submitted successfully",
            "complaint_id": complaint_id,
            "inserted_id": str(result.inserted_id),
            "acts": acts,
        }
    )


# -------------------------------------------------------------------
# VOLUNTEERS
# -------------------------------------------------------------------
@app.route("/api/volunteer", methods=["POST"])
def submit_volunteer():
    if volunteers_collection is None:
        return jsonify({"error": "DB error"}), 500

    data = request.get_json()

    required_fields = ["fullName", "email", "volunteerType", "skills"]
    if not all(field in data and data[field] for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    volunteer = {
        "fullName": data["fullName"],
        "email": data["email"],
        "volunteerType": data["volunteerType"],
        "organizationName": data.get("organizationName", ""),
        "skills": data["skills"],
    }

    volunteers_collection.insert_one(volunteer)
    return jsonify({"message": "Volunteer application submitted successfully"}), 201


@app.route("/api/volunteer", methods=["GET"])
def get_volunteers():
    if volunteers_collection is None:
        return jsonify({"error": "DB error"}), 500
    volunteers = list(volunteers_collection.find({}, {"_id": 0}))
    return jsonify(volunteers), 200


# -------------------------------------------------------------------
# ADMIN AUTH + TEAM MEMBERS
# -------------------------------------------------------------------
@app.route("/register-admin", methods=["POST"])
def register_admin():
    if admin_collection is None:
        return jsonify({"msg": "DB error"}), 500

    data = request.json

    if admin_collection.find_one({"email": data["email"]}):
        return jsonify({"msg": "Admin already exists"}), 400

    hashed = bcrypt.hashpw(data["password"].encode("utf-8"), bcrypt.gensalt())

    admin_collection.insert_one(
        {
            "name": data["name"],
            "email": data["email"],
            "password": hashed,
        }
    )

    return jsonify({"msg": "Admin registered successfully"}), 200


@app.route("/admin-login", methods=["POST"])
def admin_login():
    if admin_collection is None:
        return jsonify({"msg": "DB error"}), 500

    data = request.json
    admin = admin_collection.find_one({"email": data["email"]})

    if not admin:
        return jsonify({"msg": "Invalid email"}), 400

    if bcrypt.checkpw(data["password"].encode("utf-8"), admin["password"]):
        admin_id = str(admin["_id"])
        # Store in server-side session
        session["admin_id"] = admin_id
        return jsonify({"msg": "Login success", "admin_id": admin_id})

    return jsonify({"msg": "Invalid password"}), 400


@app.route("/admin-logout", methods=["POST"])
def admin_logout():
    """
    Clears the admin session (used by AdminDashboard logout).
    """
    session.pop("admin_id", None)
    return jsonify({"msg": "Logged out"}), 200


@app.route("/team-members-list", methods=["GET"])
def get_team_members_list():
    try:
        members = team_members_collection.find({})
        return dumps(members), 200, {"Content-Type": "application/json"}
    except Exception as e:
        print("Error fetching team members:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/add-team-member", methods=["POST"])
def add_team_member():
    data = request.json
    if not all(k in data for k in ("name", "email", "team", "password")):
        return jsonify({"error": "Missing fields"}), 400
    try:
        result = team_members_collection.insert_one(data)
        return (
            jsonify({"success": True, "inserted_id": str(result.inserted_id)}),
            201,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/member-login", methods=["POST"])
def member_login():
    data = request.json
    member = team_members_collection.find_one({"email": data["email"]})

    if not member:
        return jsonify({"msg": "Invalid email"}), 400

    # NOTE: for now, password is plaintext; you can replace with bcrypt like admin.
    if data["password"] == member["password"]:
        return jsonify(
            {
                "msg": "Login success",
                "member_id": str(member["_id"]),
                "team": member["team"],
            }
        )

    return jsonify({"msg": "Invalid password"}), 400


@app.route("/team-members/<team_name>", methods=["GET"])
def get_team_members(team_name):
    members = list(team_members_collection.find({"team": team_name}, {"password": 0}))
    for m in members:
        m["_id"] = str(m["_id"])
    return jsonify({"team": team_name, "members": members}), 200


@app.route("/team-performance/<team>", methods=["GET"])
def team_performance(team):
    members = list(team_members_collection.find({"team": team}))
    output = []

    for member in members:
        output.append(
            {
                "name": member["name"],
                "performance": member.get("performance", []),
            }
        )

    return jsonify(output)


# -------------------------------------------------------------------
# ADMIN VIEWS: WOMEN (CMP) & CYB COMPLAINTS + ASSIGN / DAILY WORK
# -------------------------------------------------------------------
def serialize_doc(doc):
    doc["_id"] = str(doc["_id"])
    for key in ["submitted_at", "created_at", "last_updated"]:
        if key in doc and isinstance(doc[key], datetime):
            doc[key] = doc[key].strftime("%Y-%m-%d %H:%M:%S")
    return doc


@app.route("/women-complaints", methods=["GET"])
def women_complaints():
    try:
        complaints = list(
            complaints_collection.find(
                {
                    "complaint_id": {"$regex": "^CMP-"},
                    "status": "pending",
                }
            )
        )
        complaints = [serialize_doc(c) for c in complaints]
        return jsonify(complaints)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/crime-complaints", methods=["GET"])
def crime_complaints():
    try:
        complaints = list(
            complaints_collection.find(
                {
                    "complaint_id": {"$regex": "^CYB-"},
                    "status": "pending",
                }
            )
        )
        complaints = [serialize_doc(c) for c in complaints]
        return jsonify(complaints)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/assign-complaint", methods=["POST"])
def assign_complaint():
    try:
        data = request.json
        complaint_id = data.get("complaint_id")
        team_name = data.get("team")
        if not complaint_id or not team_name:
            return jsonify({"error": "Missing complaint_id or team"}), 400

        result = complaints_collection.update_one(
            {"complaint_id": complaint_id},
            {
                "$set": {
                    "assigned_team": team_name,
                    "status": "assigned",
                    "last_updated": datetime.utcnow(),
                }
            },
        )

        if result.modified_count == 0:
            return (
                jsonify({"error": "Complaint not found or already assigned"}),
                404,
            )

        return jsonify(
            {
                "success": True,
                "message": f"Complaint {complaint_id} assigned to {team_name}",
            }
        ), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/assigned-complaints/<team>", methods=["GET"])
def get_assigned_complaints(team):
    """
    Used by TeamDashboard.jsx

    Returns complaints with:
    - complaint_id, attack_type, category, risk_level, ai_summary
    - scenario, additional_info, user_info, analysis_results
    - assigned_team, status, created_at, last_updated, evidence_files, etc.
    """
    try:
        complaints = list(
            complaints_collection.find(
                {
                    "assigned_team": team,
                    "status": {"$in": ["assigned", "processing"]},
                }
            )
        )

        for c in complaints:
            c["_id"] = str(c["_id"])
            for df in ["created_at", "last_updated", "submitted_at"]:
                if df in c and isinstance(c[df], datetime):
                    c[df] = c[df].isoformat()

        return jsonify(complaints)
    except Exception as e:
        print("Error fetching assigned complaints:", e)
        return jsonify([]), 500


@app.route("/update-processing", methods=["POST"])
def update_processing():
    """
    Team can post today's work log for a case.
    """
    try:
        data = request.json
        complaint_id = data["complaint_id"]
        team = data["team"]
        today_work = data["today_work"]
        today_date = datetime.now().strftime("%Y-%m-%d")

        result = complaints_collection.update_one(
            {"complaint_id": complaint_id, "assigned_team": team},
            {
                "$set": {
                    "status": "processing",
                    "last_updated": datetime.utcnow(),
                },
                "$push": {
                    "daily_updates": {"date": today_date, "work": today_work}
                },
            },
        )

        if result.matched_count == 0:
            return jsonify({"error": "Complaint not found"}), 404

        return jsonify({"message": "Processing updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/complete-complaint", methods=["POST"])
def complete_complaint():
    """
    Team uploads final report (PDF, DOCX, etc.) + marks complaint completed.
    """
    try:
        complaint_id = request.form["complaint_id"]
        team = request.form["team"]
        report = request.files.get("report")

        report_filename = None
        if report:
            os.makedirs(reports_abs, exist_ok=True)
            report_filename = os.path.join(
                REPORTS_FOLDER, f"{complaint_id}_{report.filename}"
            )
            full_path = os.path.join(app.root_path, report_filename)
            report.save(full_path)

        result = complaints_collection.update_one(
            {"complaint_id": complaint_id, "assigned_team": team},
            {
                "$set": {
                    "status": "completed",
                    "completion_report": report_filename,
                    "last_updated": datetime.utcnow(),
                }
            },
        )

        if result.matched_count == 0:
            return jsonify({"error": "Complaint not found"}), 404

        return jsonify({"message": "Complaint marked complete"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/all-complaints-daily-work", methods=["GET"])
def get_all_daily_work():
    """
    Admin view: shows teams + their assigned complaints + daily updates.
    """
    try:
        complaints = list(complaints_collection.find({}))

        teams_dict = {}
        for c in complaints:
            team = c.get("assigned_team", "Unassigned")
            if team not in teams_dict:
                teams_dict[team] = []

            teams_dict[team].append(
                {
                    "complaint_id": c.get("complaint_id"),
                    "status": c.get("status", "pending"),
                    "daily_updates": sorted(
                        c.get("daily_updates", []),
                        key=lambda x: x.get("date"),
                    ),
                    "completion_report": c.get("completion_report"),
                }
            )

        return jsonify(teams_dict)
    except Exception as e:
        print("Error fetching daily work:", e)
        return jsonify({}), 500


@app.route("/team-stats", methods=["GET"])
def team_stats():
    """
    Returns a mapping of team_name -> number of assigned/processing cases.
    Used by AdminDashboard.jsx to show workload per team.
    """
    if complaints_collection is None:
        return jsonify({"stats": {}}), 500
    try:
        pipeline = [
            {
                "$match": {
                    "assigned_team": {"$exists": True, "$ne": ""},
                    "status": {"$in": ["assigned", "processing"]},
                }
            },
            {"$group": {"_id": "$assigned_team", "count": {"$sum": 1}}},
        ]
        agg = list(complaints_collection.aggregate(pipeline))
        stats = {doc["_id"]: doc["count"] for doc in agg}
        return jsonify({"stats": stats})
    except Exception as e:
        print("Error computing team stats:", e)
        return jsonify({"stats": {}}), 500


user_otp_storage = {}


# -------------------------
# SEND OTP
# -------------------------
@app.route("/send-user-otp", methods=["POST"])
def send_user_otp():
    try:
        data = request.get_json()
        phone = data.get("phone")

        if not phone:
            return jsonify({"status": "error", "message": "Phone number required"}), 400

        # Normalize phone number
        phone = phone.strip()
        if not phone.startswith("+"):
            phone = "+91" + phone

        # Generate OTP
        otp = generate_otp()
        user_otp_storage[phone] = otp
        print(f"[USER OTP GENERATED] {phone} → {otp}")

        # Send SMS using Twilio
        message = twilio_client.messages.create(
            body=f"Your OTP for user verification is {otp}. - Kongunadu Team, Six Strangers.",
            from_=TWILIO_PHONE_NUMBER,
            to=phone,
        )

        print(f"[TWILIO MESSAGE SID] {message.sid}")

        return jsonify({"status": "success", "message": "User OTP sent successfully"})

    except Exception as e:
        print("Error sending User OTP:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


# -----------------------------
# VERIFY OTP
# -----------------------------
@app.route("/verify-user-otp", methods=["POST"])
def verify_user_otp():
    try:
        data = request.get_json()
        phone = data.get("phone")
        otp = data.get("otp")

        if not phone or not otp:
            return jsonify({"verified": False, "message": "Phone and OTP required"}), 400

        # Normalize phone
        phone = phone.strip()
        if not phone.startswith("+"):
            phone = "+91" + phone

        stored_otp = user_otp_storage.get(phone)

        if stored_otp == otp:
            # Mark as verified
            otp_verified[phone] = True

            # Remove OTP for security
            user_otp_storage.pop(phone, None)

            print(f"[USER OTP VERIFIED] {phone}")
            return jsonify({"verified": True})

        return jsonify({"verified": False, "message": "Invalid OTP"}), 400

    except Exception as e:
        print("Error verifying User OTP:", e)
        return jsonify({"verified": False, "message": str(e)}), 500


# -----------------------------
# SAVE USER (AFTER OTP VERIFIED)
# -----------------------------
@app.route("/save-user", methods=["POST"])
def save_user():
    try:
        data = request.json

        if not data.get("name") or not data.get("phone"):
            return jsonify({"success": False, "message": "Missing fields"}), 400

        entry = {
            "name": data["name"],
            "phone": data["phone"],
            "created_at": datetime.utcnow()
        }

        if user_collection is None:
            return jsonify({"success": False, "message": "DB error"}), 500

        user_collection.insert_one(entry)

        return jsonify({"success": True, "message": "User saved successfully!"})
    except Exception as e:
        return jsonify({"success": False, "message": "Server error"}), 500


# -------------------------------------------------------------------
# RUN SERVER
# -------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 80)
    print("      ADVANCED CYBERSECURITY ANALYSIS PLATFORM (LOCAL LLM)")
    print("=" * 80)
    print(f"\n🔌 Ollama base URL: {OLLAMA_BASE_URL}")
    print(f"🤖 Local LLM model: {LOCAL_LLM_MODEL}")
    print("🚀 Starting Flask server on http://0.0.0.0:5006")
    print("=" * 80 + "\n")
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 5006)))
