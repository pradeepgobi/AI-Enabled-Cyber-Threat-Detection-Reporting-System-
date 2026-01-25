
import React, { useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./Women.css";

const statesAndDistricts = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Kadapa", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari"],
  "Arunachal Pradesh": ["Tawang", "West Kameng", "East Kameng", "Papum Pare", "Kurung Kumey", "Lower Subansiri", "Upper Subansiri", "West Siang", "East Siang", "Siang", "Upper Siang", "Lower Siang", "Lower Dibang Valley", "Dibang Valley", "Anjaw", "Lohit", "Namsai", "Changlang", "Tirap", "Longding"],
  "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
  "Bihar": ["Araria","Arwal","Aurangabad","Banka","Begusarai","Bhagalpur","Bhojpur","Buxar","Darbhanga","East Champaran","Gaya","Gopalganj","Jamui","Jehanabad","Kaimur","Katihar","Khagaria","Kishanganj","Lakhisarai","Madhepura","Madhubani","Munger","Muzaffarpur","Nalanda","Nawada","Patna","Purnia","Rohtas","Saharsa","Samastipur","Saran","Sheikhpura","Sheohar","Sitamarhi","Siwan","Supaul","Vaishali","West Champaran"],
  "Chhattisgarh": ["Balod","Baloda Bazar","Balrampur","Bastar","Bemetara","Bijapur","Bilaspur","Dantewada","Dhamtari","Durg","Gariaband","Janjgir-Champa","Jashpur","Kabirdham","Kanker","Kawardha","Korba","Koriya","Mahasamund","Mungeli","Narayanpur","Raigarh","Raipur","Rajnandgaon","Sukma","Surajpur","Surguja"],
  "Goa": ["North Goa", "South Goa"],
  "Gujarat": ["Ahmedabad","Amreli","Anand","Aravalli","Banaskantha","Bharuch","Bhavnagar","Botad","Chhota Udaipur","Dahod","Dang","Devbhoomi Dwarka","Gandhinagar","Gir Somnath","Jamnagar","Junagadh","Kheda","Kutch","Mahisagar","Mehsana","Morbi","Narmada","Navsari","Patan","Panchmahal","Porbandar","Rajkot","Sabarkantha","Surat","Surendranagar","Tapi","Vadodara","Valsad"],
  "Haryana": ["Ambala","Bhiwani","Charkhi Dadri","Faridabad","Fatehabad","Gurugram","Hisar","Jhajjar","Jind","Kaithal","Karnal","Kurukshetra","Mahendragarh","Mewat","Palwal","Panchkula","Panipat","Rewari","Rohtak","Sirsa","Sonipat","Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur","Chamba","Hamirpur","Kangra","Kinnaur","Kullu","Lahaul & Spiti","Mandi","Shimla","Sirmaur","Solan","Una"],
  "Jharkhand": ["Bokaro","Chatra","Deoghar","Dhanbad","Dumka","East Singhbhum","Garhwa","Giridih","Godda","Gumla","Hazaribagh","Jamtara","Khunti","Koderma","Latehar","Lohardaga","Pakur","Palamu","Ramgarh","Ranchi","Sahibganj","Seraikela-Kharsawan","Simdega","West Singhbhum"],
  "Karnataka": ["Bagalkot","Bangalore Rural","Bangalore Urban","Belagavi","Ballari","Bidar","Chamarajanagar","Chikkaballapura","Chikkamagaluru","Chitradurga","Dakshina Kannada","Davangere","Dharwad","Gadag","Hassan","Haveri","Kalaburagi","Kodagu","Kolar","Koppal","Mandya","Mysuru","Raichur","Ramanagara","Shivamogga","Tumakuru","Udupi","Uttara Kannada","Vijayapura","Yadgir"],
  "Kerala": ["Alappuzha","Ernakulam","Idukki","Kannur","Kasaragod","Kollam","Kottayam","Kozhikode","Malappuram","Palakkad","Pathanamthitta","Thiruvananthapuram","Thrissur","Wayanad"],
  "Madhya Pradesh": ["Agar Malwa","Alirajpur","Anuppur","Ashoknagar","Balaghat","Barwani","Betul","Bhind","Bhopal","Burhanpur","Chhatarpur","Chhindwara","Damoh","Datia","Dewas","Dhar","Dindori","Guna","Gwalior","Harda","Hoshangabad","Indore","Jabalpur","Jhabua","Katni","Khandwa","Khargone","Mandla","Mandsaur","Morena","Narsinghpur","Neemuch","Panna","Raisen","Rajgarh","Ratlam","Rewa","Sagar","Satna","Sehore","Seoni","Shahdol","Shajapur","Sheopur","Shivpuri","Sidhi","Singrauli","Tikamgarh","Ujjain","Umaria","Vidisha"],
  "Maharashtra": ["Ahmednagar","Akola","Amravati","Aurangabad","Beed","Bhandara","Buldhana","Chandrapur","Dhule","Gadchiroli","Gondia","Hingoli","Jalgaon","Jalna","Kolhapur","Latur","Mumbai City","Mumbai Suburban","Nagpur","Nanded","Nandurbar","Nashik","Osmanabad","Palghar","Parbhani","Pune","Raigad","Ratnagiri","Sangli","Satara","Sindhudurg","Solapur","Thane","Wardha","Washim","Yavatmal"],
  "Manipur": ["Bishnupur","Chandel","Churachandpur","Imphal East","Imphal West","Jiribam","Kakching","Kamjong","Kangpokpi","Noney","Pherzawl","Senapati","Tamenglong","Tengnoupal","Thoubal","Ukhrul"],
  "Meghalaya": ["East Garo Hills","East Jaintia Hills","East Khasi Hills","North Garo Hills","Ri Bhoi","South Garo Hills","South West Garo Hills","South West Khasi Hills","West Garo Hills","West Jaintia Hills","West Khasi Hills"],
  "Mizoram": ["Aizawl","Champhai","Kolasib","Lawngtlai","Lunglei","Mamit","Saiha","Serchhip"],
  "Nagaland": ["Dimapur","Kiphire","Kohima","Longleng","Mokokchung","Mon","Peren","Phek","Tuensang","Wokha","Zunheboto"],
  "Odisha": ["Angul","Balangir","Balasore","Bargarh","Bhadrak","Boudh","Cuttack","Deogarh","Dhenkanal","Gajapati","Ganjam","Jagatsinghpur","Jajpur","Jharsuguda","Kalahandi","Kandhamal","Kendrapara","Kendujhar","Khordha","Koraput","Malkangiri","Mayurbhanj","Nabarangpur","Nuapada","Puri","Rayagada","Sambalpur","Sonepur","Sundargarh"],
  "Punjab": ["Amritsar","Barnala","Bathinda","Faridkot","Fatehgarh Sahib","Fazilka","Ferozepur","Gurdaspur","Hoshiarpur","Jalandhar","Kapurthala","Ludhiana","Mansa","Moga","Muktsar","Pathankot","Patiala","Rupnagar","Sahibzada Ajit Singh Nagar","Sangrur","Tarn Taran"],
  "Rajasthan": ["Ajmer","Alwar","Banswara","Baran","Barmer","Bharatpur","Bhilwara","Bikaner","Bundi","Chittorgarh","Churu","Dausa","Dholpur","Dungarpur","Hanumangarh","Jaipur","Jaisalmer","Jalore","Jhalawar","Jhunjhunu","Jodhpur","Karauli","Kota","Nagaur","Pali","Pratapgarh","Rajsamand","Sawai Madhopur","Sikar","Sirohi","Tonk","Udaipur"],
  "Sikkim": ["East Sikkim","North Sikkim","South Sikkim","West Sikkim"],
  "Tamil Nadu": ["Ariyalur","Chengalpattu","Chennai","Coimbatore","Cuddalore","Dharmapuri","Dindigul","Erode","Kallakurichi","Kanchipuram","Kanyakumari","Karur","Krishnagiri","Madurai","Nagapattinam","Namakkal","Nilgiris","Perambalur","Pudukkottai","Ramanathapuram","Ranipet","Salem","Sivaganga","Tenkasi","Thanjavur","Theni","Thoothukudi","Tiruchirappalli","Tirunelveli","Tirupathur","Tiruppur","Tiruvallur","Tiruvarur","Vellore","Viluppuram","Virudhunagar"],
  "Telangana": ["Adilabad","Bhadradri Kothagudem","Hyderabad","Jagtial","Jangaon","Jayashankar Bhupalpally","Jogulamba Gadwal","Kamareddy","Karimnagar","Khammam","Komaram Bheem Asifabad","Mahabubabad","Mahbubnagar","Mancherial","Medak","Medchal–Malkajgiri","Mulugu","Nagarkurnool","Nalgonda","Narayanpet","Nirmal","Nizamabad","Peddapalli","Rajanna Sircilla","Rangareddy","Sangareddy","Siddipet","Suryapet","Vikarabad","Wanaparthy","Warangal Rural","Warangal Urban","Yadadri Bhuvanagiri"],
  "Tripura": ["Dhalai","Gomati","Khowai","North Tripura","Sepahijala","South Tripura","Unakoti","West Tripura"],
  "Uttar Pradesh": ["Agra","Aligarh","Ambedkar Nagar","Amethi","Amroha","Auraiya","Azamgarh","Baghpat","Bahraich","Ballia","Balrampur","Banda","Barabanki","Bareilly","Basti","Bhadohi","Bijnor","Budaun","Bulandshahr","Chandauli","Chitrakoot","Deoria","Etah","Etawah","Ayodhya","Farrukhabad","Fatehpur","Firozabad","Gautam Buddha Nagar","Ghaziabad","Ghazipur","Gonda","Gorakhpur","Hamirpur","Hapur","Hardoi","Hathras","Jalaun","Jaunpur","Jhansi","Kannauj","Kanpur Dehat","Kanpur Nagar","Kasganj","Kaushambi","Kushinagar","Lalitpur","Lucknow","Maharajganj","Mahoba","Mainpuri","Mathura","Mau","Meerut","Mirzapur","Moradabad","Muzaffarnagar","Pilibhit","Pratapgarh","Raebareli","Rampur","Saharanpur","Sambhal","Sant Kabir Nagar","Shahjahanpur","Shamli","Shrawasti","Siddharthnagar","Sitapur","Sonbhadra","Sultanpur","Unnao","Varanasi"],
  "Uttarakhand": ["Almora","Bageshwar","Chamoli","Champawat","Dehradun","Haridwar","Nainital","Pauri Garhwal","Pithoragarh","Rudraprayag","Tehri Garhwal","Udham Singh Nagar","Uttarkashi"],
  "West Bengal": ["Alipurduar","Bankura","Birbhum","Cooch Behar","Dakshin Dinajpur","Darjeeling","Hooghly","Howrah","Jalpaiguri","Jhargram","Kalimpong","Kolkata","Malda","Murshidabad","Nadia","North 24 Parganas","Paschim Bardhaman","Paschim Medinipur","Purba Bardhaman","Purba Medinipur","Purulia","South 24 Parganas","Uttar Dinajpur"],
  "Delhi": ["Central Delhi","East Delhi","New Delhi","North Delhi","North East Delhi","North West Delhi","Shahdara","South Delhi","South East Delhi","South West Delhi","West Delhi"],
  "Puducherry": ["Karaikal","Mahe","Puducherry","Yanam"]
};

export default function Women() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    category: "",
    date: "",
    hour: "",
    minute: "",
    ampm: "AM",
    state: "",
    district: "",
    policeStation: "",
    location: "",
    additionalInfo: "",
    name: "",
    email: "",
    phone: "",
    otp: "",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acts, setActs] = useState([]); // Store AI-suggested acts

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    const required = ["category", "date", "hour", "minute", "state", "district", "location", "additionalInfo"];
    for (let field of required) {
      if (!formData[field]) {
        alert("Please fill all required fields.");
        return;
      }
    }
    setStep(2);
  };

  const sendOtp = async () => {
    if (!formData.phone) return alert("Enter phone number");

    let phone = formData.phone.startsWith("+") ? formData.phone : "+91" + formData.phone;

    try {
      setLoading(true);
      await axios.post("http://localhost:5006/send-otp", { phone });
      setOtpSent(true);
      alert("OTP sent successfully!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!formData.otp) return alert("Enter OTP");

    let phone = formData.phone.startsWith("+") ? formData.phone : "+91" + formData.phone;

    try {
      setLoading(true);
      const verifyResp = await axios.post("http://localhost:5006/verify-otp", {
        phone,
        otp: formData.otp
      });

      if (!verifyResp.data || !verifyResp.data.verified) {
        alert("OTP invalid. Try again.");
        return;
      }

      setOtpVerified(true);

      // Submit complaint
      const submitResp = await axios.post("http://localhost:5006/submit-complaint-women", {
        ...formData,
        phone
      });

      if (!submitResp.data || !submitResp.data.complaint_id) {
        alert("Complaint submission failed.");
        return;
      }

      const complaintId = submitResp.data.complaint_id;
      const aiActs = submitResp.data.acts || [];
      setActs(aiActs);

      alert(`Complaint submitted! ID: ${complaintId}`);

      // Generate FIR PDF including acts
      generateFIR(formData, complaintId, aiActs);
      resetForm();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "OTP verification or submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      category: "",
      date: "",
      hour: "",
      minute: "",
      ampm: "AM",
      state: "",
      district: "",
      policeStation: "",
      location: "",
      additionalInfo: "",
      name: "",
      email: "",
      phone: "",
      otp: "",
    });
    setStep(1);
    setOtpSent(false);
    setOtpVerified(false);
    setActs([]);
  };

  const generateFIR = (data, complaintId, acts) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  /* ---------------- HEADER ---------------- */
  doc.addImage(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/245px-Emblem_of_India.svg.png",
    "PNG",
    20,
    15,
    40,
    50
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("GOVERNMENT OF INDIA", pageWidth / 2, 30, { align: "center" });

  doc.setFontSize(14);
  doc.text("MINISTRY OF HOME AFFAIRS", pageWidth / 2, 48, { align: "center" });

  doc.setFontSize(12);
  doc.text("National Cyber Crime Reporting Portal", pageWidth / 2, 63, {
    align: "center",
  });

  doc.setFontSize(16);
  doc.text("FIRST INFORMATION REPORT (FIR)", pageWidth / 2, 88, {
    align: "center",
  });

  doc.setLineWidth(0.5);
  doc.line(20, 95, pageWidth - 20, 95);

  /* ---------------- META INFO ---------------- */
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, pageWidth - 20, 110, {
    align: "right",
  });
  doc.text(`Report Time: ${new Date().toLocaleTimeString()}`, pageWidth - 20, 125, {
    align: "right",
  });

  doc.setFont("helvetica", "bold");
  doc.text(`REGISTERED CASE NO: ${complaintId}`, 20, 110);
  doc.setFont("helvetica", "normal");
  doc.text(`Status: SUBMITTED (Pending Investigation)`, 20, 125);

  /* ---------------- WATERMARK ---------------- */
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.08 }));
  doc.setFontSize(60);
  doc.setTextColor(150);
  doc.text("GOVT OFFICIAL COPY", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 45,
  });
  doc.restoreGraphicsState();

  /* ---------------- SECTION A ---------------- */
  doc.setFontSize(12);
  autoTable(doc, {
    startY: 140,
    head: [["SECTION A: COMPLAINANT INFORMATION", ""]],
    body: [
      ["Full Name", data.name || "Anonymous"],
      ["Email", data.email || "N/A"],
      ["Phone Number", data.phone || "N/A"],
      ["State", data.state || "N/A"],
      ["District", data.district || "N/A"],
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 150 } },
  });

  /* ---------------- SECTION B ---------------- */
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 15,
    head: [["SECTION B: INCIDENT DETAILS", ""]],
    body: [
      ["Category", data.category],
      ["Date", data.date],
      ["Time", `${data.hour}:${data.minute} ${data.ampm}`],
      ["Police Station", data.policeStation],
      ["Location", data.location],
      ["Additional Info", data.additionalInfo],
    ],
    theme: "grid",
    headStyles: { fillColor: [185, 28, 28], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 150 } },
  });

  /* ---------------- SECTION C ---------------- */
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(
    "SECTION C: DETAILED INCIDENT NARRATIVE",
    20,
    doc.lastAutoTable.finalY + 20
  );

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 25,
    body: [[data.additionalInfo]],
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 5 },
  });

  /* ---------------- SECTION D (AI ACTS) ---------------- */
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  let y = doc.lastAutoTable.finalY + 20;
  doc.text("SECTION D: AI-Suggested Legal Acts", 20, y);

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  acts.forEach((act, index) => {
    doc.text(
      `${index + 1}. Act: ${act.act} (Sections: ${act.sections.join(", ")})`,
      25,
      y
    );
    y += 12;
    doc.text(`Description: ${act.description}`, 35, y);
    y += 18;
  });

  /* ---------------- SIGNATURE ---------------- */
  y += 20;
  doc.setFontSize(10);

  doc.text("(Digitally Signed by Complainant)", 20, y);
  doc.line(pageWidth - 140, y - 5, pageWidth - 20, y - 5);

  doc.text("Authorized Signatory / Duty Officer", pageWidth - 140, y + 10);
  doc.text("National Cyber Crime Cell", pageWidth - 140, y + 22);

  /* ---------------- TRACK CASE LINK ---------------- */
  y += 40;
  const trackURL = `https://cybercrime.gov.in/track?id=${complaintId}`;
  doc.setTextColor(0, 0, 255);
  doc.textWithLink(`Track your case status here: ${trackURL}`, 20, y, {
    url: trackURL,
  });

  /* ---------------- FOOTER ---------------- */
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    "This is a computer generated report and does not require a physical signature.",
    20,
    pageHeight - 30
  );
  doc.text(
    `Generated via Cyber Crime Portal | Case ID: ${complaintId}`,
    20,
    pageHeight - 20
  );

  doc.save(`FIR_${complaintId}.pdf`);
};

  const districts = formData.state ? statesAndDistricts[formData.state] || [] : [];

  return (
    <div className="women-container">
      <h1>Women & Child Safety Complaint</h1>

      {/* ---------------- STEP 1 FORM ---------------- */}
      {step === 1 && (
        <form className="women-form" onSubmit={handleNext}>
          <label>Category *</label>
          <select name="category" onChange={handleChange} value={formData.category} required>
            <option value="">--- Select ---</option>
            <option value="RGR">Rape / Gang Rape</option>
            <option value="SexuallyObscene">Sexually Obscene Material</option>
            <option value="SexuallyExplicit">Sexually Explicit Act</option>
            <option value="CSEAM">CSEAM</option>
          </select>

          <label>Date *</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} required />

          <label>Time *</label>
          <div className="time-row">
            <input type="number" name="hour" placeholder="HH" min="1" max="12" value={formData.hour} onChange={handleChange} required />
            <input type="number" name="minute" placeholder="MM" min="0" max="59" value={formData.minute} onChange={handleChange} required />
            <select name="ampm" value={formData.ampm} onChange={handleChange}>
              <option>AM</option>
              <option>PM</option>
            </select>
          </div>

          <label>State *</label>
          <select name="state" value={formData.state} onChange={handleChange} required>
            <option value="">--- Select State ---</option>
            {Object.keys(statesAndDistricts).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <label>District *</label>
          <select name="district" value={formData.district} onChange={handleChange} required>
            <option value="">--- Select District ---</option>
            {formData.state &&
              statesAndDistricts[formData.state]?.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
          </select>

          <label>Police Station</label>
          <input type="text" name="policeStation" value={formData.policeStation} onChange={handleChange} />

          <label>Location *</label>
          <input type="text" name="location" value={formData.location} onChange={handleChange} required />

          <label>Details *</label>
          <textarea name="additionalInfo" value={formData.additionalInfo} onChange={handleChange} required />

          <button type="submit" className="btn-primary">Next</button>
        </form>
      )}

      {/* ---------------- STEP 2 FORM ---------------- */}
      {step === 2 && (
        <div className="women-form">
          <label>Your Name</label>
          <input name="name" value={formData.name} onChange={handleChange} />

          <label>Email</label>
          <input name="email" value={formData.email} onChange={handleChange} />

          <label>Phone *</label>
          <input name="phone" value={formData.phone} onChange={handleChange} required />

          {!otpSent && (
            <button onClick={sendOtp} disabled={loading} className="btn-primary">
              {loading ? "Sending..." : "Send OTP"}
            </button>
          )}

          {otpSent && !otpVerified && (
            <>
              <label>Enter OTP</label>
              <input name="otp" value={formData.otp} onChange={handleChange} />

              <button onClick={verifyOtp} disabled={loading} className="btn-primary">
                {loading ? "Verifying..." : "Verify OTP & Submit"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}