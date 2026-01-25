import os
import json
import base64

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

# ---------------- PATHS ----------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEYS_DIR = os.path.join(BASE_DIR, "keys")

PRIVATE_KEY_PATH = os.path.join(KEYS_DIR, "rsa_private.pem")
PUBLIC_KEY_PATH = os.path.join(KEYS_DIR, "rsa_public.pem")


def ensure_keys_exist():
    """
    If RSA key pair does not exist in keys/, generate a 4096-bit pair.
    The PUBLIC key is used for encryption, PRIVATE key only for decryption.
    """
    os.makedirs(KEYS_DIR, exist_ok=True)

    if not (os.path.exists(PRIVATE_KEY_PATH) and os.path.exists(PUBLIC_KEY_PATH)):
        print("[-] RSA keys not found, generating new keys...")

        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=4096,
            backend=default_backend(),
        )
        public_key = private_key.public_key()

        # Save private key (no password here; you can add one later)
        with open(PRIVATE_KEY_PATH, "wb") as f:
            f.write(
                private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.TraditionalOpenSSL,
                    encryption_algorithm=serialization.NoEncryption(),
                )
            )

        # Save public key
        with open(PUBLIC_KEY_PATH, "wb") as f:
            f.write(
                public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo,
                )
            )

        print(f"[+] RSA keys generated in: {KEYS_DIR}")
    else:
        print(f"[+] RSA keys already exist in: {KEYS_DIR}")


def load_public_key():
    ensure_keys_exist()
    with open(PUBLIC_KEY_PATH, "rb") as f:
        data = f.read()
    return serialization.load_pem_public_key(data, backend=default_backend())


def load_private_key():
    ensure_keys_exist()
    with open(PRIVATE_KEY_PATH, "rb") as f:
        data = f.read()
    return serialization.load_pem_private_key(
        data,
        password=None,
        backend=default_backend(),
    )


def encrypt_complaint_payload(payload: dict) -> dict:
    """
    INPUT:  Python dict (all sensitive complaint/user data).
    OUTPUT: Encrypted structure safe for MongoDB (base64 fields).

    - AES-256-GCM is used for actual payload encryption.
    - AES key is then encrypted with RSA-OAEP using the PUBLIC key.
    """
    public_key = load_public_key()

    # 1) Serialize dict to bytes
    plaintext = json.dumps(payload).encode("utf-8")

    # 2) Generate AES key + nonce
    aes_key = os.urandom(32)   # AES-256
    nonce = os.urandom(12)     # recommended size for GCM

    # 3) AES-GCM encrypt
    encryptor = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(nonce),
        backend=default_backend()
    ).encryptor()

    ciphertext = encryptor.update(plaintext) + encryptor.finalize()
    tag = encryptor.tag

    # 4) Encrypt AES key with RSA-OAEP
    encrypted_key = public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )

    # 5) Base64 encode for DB
    return {
        "ciphertext": base64.b64encode(ciphertext).decode("utf-8"),
        "nonce": base64.b64encode(nonce).decode("utf-8"),
        "tag": base64.b64encode(tag).decode("utf-8"),
        "encrypted_aes_key": base64.b64encode(encrypted_key).decode("utf-8"),
    }


def decrypt_complaint_payload(enc_doc: dict) -> dict:
    """
    Reverse of encrypt_complaint_payload().
    INPUT:  Encrypted fields as stored in MongoDB.
    OUTPUT: Original Python dict with all sensitive fields.
    """
    private_key = load_private_key()

    ciphertext = base64.b64decode(enc_doc["ciphertext"])
    nonce = base64.b64decode(enc_doc["nonce"])
    tag = base64.b64decode(enc_doc["tag"])
    encrypted_aes_key = base64.b64decode(enc_doc["encrypted_aes_key"])

    # 1) Decrypt AES key with RSA private key
    aes_key = private_key.decrypt(
        encrypted_aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )

    # 2) AES-GCM decrypt
    decryptor = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(nonce, tag),
        backend=default_backend()
    ).decryptor()

    plaintext = decryptor.update(ciphertext) + decryptor.finalize()
    return json.loads(plaintext.decode("utf-8"))
