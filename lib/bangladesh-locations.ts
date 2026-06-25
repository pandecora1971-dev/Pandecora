/**
 * Static geographic data for Bangladesh.
 * Structure: division → district → upazila[]
 *
 * District names exactly match DISTRICTS_BY_DIVISION in validators.ts.
 * All data is public administrative information.
 */
export const BANGLADESH_LOCATIONS: Record<string, Record<string, string[]>> = {
  Dhaka: {
    Dhaka: [
      "Cantonment", "Dakshinkhan", "Demra", "Dhanmondi", "Dohar",
      "Gulshan", "Hazaribagh", "Kafrul", "Kamrangirchar", "Keraniganj",
      "Khilgaon", "Khilkhet", "Kotwali", "Lalbagh", "Mirpur",
      "Mohammadpur", "Motijheel", "Nawabganj", "Pallabi", "Ramna",
      "Sabujbagh", "Savar", "Shah Ali", "Shyampur", "Tejgaon",
      "Turag", "Uttara", "Wari",
    ],
    Faridpur: [
      "Alfadanga", "Bhanga", "Boalmari", "Charbhadrasan",
      "Faridpur Sadar", "Madhukhali", "Nagarkanda", "Sadarpur", "Saltha",
    ],
    Gazipur: ["Gazipur Sadar", "Kaliakair", "Kaligor", "Kapasia", "Sreepur"],
    Gopalganj: ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
    Kishoreganj: [
      "Austagram", "Bajitpur", "Bhairab", "Hossainpur", "Itna",
      "Karimganj", "Katiadi", "Kishoreganj Sadar", "Kuliarchar",
      "Mithamain", "Nikli", "Pakundia", "Tarail",
    ],
    Madaripur: ["Kalkini", "Madaripur Sadar", "Rajoir", "Shibchar"],
    Manikganj: [
      "Daulatpur", "Ghior", "Harirampur", "Manikganj Sadar",
      "Saturia", "Shibalaya", "Singair",
    ],
    Munshiganj: [
      "Gazaria", "Louhajang", "Munshiganj Sadar",
      "Sirajdikhan", "Srinagar", "Tongibari",
    ],
    Narayanganj: ["Araihazar", "Bandar", "Narayanganj Sadar", "Rupganj", "Sonargaon"],
    Narsingdi: ["Belabo", "Monohardi", "Narsingdi Sadar", "Palash", "Raipura", "Shibpur"],
    Rajbari: ["Baliakandi", "Goalandaghat", "Kalukhali", "Pangsha", "Rajbari Sadar"],
    Shariatpur: [
      "Bhedarganj", "Damudya", "Gosairhat", "Naria",
      "Shariatpur Sadar", "Zajira",
    ],
    Tangail: [
      "Basail", "Bhuapur", "Delduar", "Dhanbari", "Ghatail",
      "Gopalpur", "Kalihati", "Madhupur", "Mirzapur",
      "Nagarpur", "Sakhipur", "Tangail Sadar",
    ],
  },

  Chattogram: {
    Bandarban: [
      "Alikadam", "Bandarban Sadar", "Lama",
      "Naikhangchhari", "Rowangchhari", "Ruma", "Thanchi",
    ],
    Brahmanbaria: [
      "Akhaura", "Ashuganj", "Bancharampur", "Bijoynagar",
      "Brahmanbaria Sadar", "Kasba", "Nabinagar", "Nasirnagar", "Sarail",
    ],
    Chandpur: [
      "Chandpur Sadar", "Faridganj", "Haimchar", "Haziganj",
      "Kachua", "Matlab North", "Matlab South", "Shahrasti",
    ],
    Chattogram: [
      "Anwara", "Banshkhali", "Boalkhali", "Chandanaish", "Chattogram Sadar",
      "Fatikchhari", "Hathazari", "Karnaphuli", "Lohagara", "Mirsharai",
      "Patiya", "Rangunia", "Raozan", "Sandwip", "Satkania", "Sitakunda",
    ],
    Comilla: [
      "Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram",
      "Comilla Sadar", "Comilla Sadar South", "Daudkandi", "Debidwar",
      "Homna", "Laksam", "Lalmai", "Meghna", "Monohorgonj",
      "Muradnagar", "Nangalkot", "Titas",
    ],
    "Cox's Bazar": [
      "Chakaria", "Cox's Bazar Sadar", "Kutubdia",
      "Maheshkhali", "Pekua", "Ramu", "Teknaf", "Ukhia",
    ],
    Feni: [
      "Chhagalnaiya", "Daganbhuiyan", "Feni Sadar",
      "Fulgazi", "Parshuram", "Sonagazi",
    ],
    Khagrachari: [
      "Dighinala", "Guimara", "Khagrachari Sadar", "Lakshmichhari",
      "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramgarh",
    ],
    Lakshmipur: ["Kamalnagar", "Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati"],
    Noakhali: [
      "Begumganj", "Chatkhil", "Companiganj", "Hatiya",
      "Kabirhat", "Noakhali Sadar", "Senbagh", "Sonaimuri", "Subarnachar",
    ],
    Rangamati: [
      "Bagaichhari", "Barkal", "Belaichhari", "Juraichhari", "Kaptai",
      "Kawkhali", "Langadu", "Naniarchar", "Rajasthali", "Rangamati Sadar",
    ],
  },

  Rajshahi: {
    Bogura: [
      "Adamdighi", "Bogura Sadar", "Dhunat", "Dhupchanchia", "Gabtali",
      "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur",
      "Sherpur", "Shibganj", "Sonatala",
    ],
    Chapainawabganj: [
      "Bholahat", "Chapainawabganj Sadar", "Gomastapur", "Nachole", "Shibganj",
    ],
    Joypurhat: ["Akkelpur", "Joypurhat Sadar", "Kalai", "Khetlal", "Panchbibi"],
    Naogaon: [
      "Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mahadebpur",
      "Mohanpur", "Naogaon Sadar", "Niamatpur", "Patnitala",
      "Porsha", "Raninagar", "Sapahar",
    ],
    Natore: ["Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Natore Sadar", "Singra"],
    Pabna: [
      "Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur",
      "Ishwardi", "Pabna Sadar", "Santhia", "Sujanagar",
    ],
    Rajshahi: [
      "Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari",
      "Mohanpur", "Paba", "Puthia", "Rajshahi Sadar", "Tanore",
    ],
    Sirajganj: [
      "Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Raiganj",
      "Shahjadpur", "Sirajganj Sadar", "Tarash", "Ullahpara",
    ],
  },

  Khulna: {
    Bagerhat: [
      "Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua",
      "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola",
    ],
    Chuadanga: ["Alamdanga", "Chuadanga Sadar", "Damurhuda", "Jibannagar"],
    Jashore: [
      "Abhaynagar", "Bagherpara", "Chaugachha", "Jashore Sadar",
      "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha",
    ],
    Jhenaidah: [
      "Harinakunda", "Jhenaidah Sadar", "Kaliganj",
      "Kotchandpur", "Maheshpur", "Shailkupa",
    ],
    Khulna: [
      "Batiaghata", "Dacope", "Dighalia", "Dumuria", "Khulna Sadar",
      "Koyra", "Paikgachha", "Phultala", "Rupsa", "Terokhada",
    ],
    Kushtia: ["Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Kushtia Sadar", "Mirpur"],
    Magura: ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"],
    Meherpur: ["Gangni", "Meherpur Sadar", "Mujibnagar"],
    Narail: ["Kalia", "Lohagara", "Narail Sadar"],
    Satkhira: [
      "Assasuni", "Debhata", "Kalaroa", "Kaliganj",
      "Satkhira Sadar", "Shyamnagar", "Tala",
    ],
  },

  Barishal: {
    Barguna: ["Amtali", "Bamna", "Barguna Sadar", "Betagi", "Pathorghata", "Taltali"],
    Barishal: [
      "Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Barishal Sadar",
      "Gaurnadi", "Hijla", "Mehendiganj", "Muladi", "Wazirpur",
    ],
    Bhola: [
      "Bhola Sadar", "Burhanuddin", "Char Fasson",
      "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin",
    ],
    Jhalokati: ["Jhalokati Sadar", "Kanthalia", "Nalchity", "Rajapur"],
    Patuakhali: [
      "Bauphal", "Dashmina", "Dumki", "Galachipa",
      "Kalapara", "Mirzaganj", "Patuakhali Sadar", "Rangabali",
    ],
    Pirojpur: [
      "Bhandaria", "Kawkhali", "Mathbaria",
      "Nazirpur", "Nesarabad", "Pirojpur Sadar", "Zianagar",
    ],
  },

  Sylhet: {
    Habiganj: [
      "Ajmiriganj", "Bahubal", "Baniachong", "Chunarughat",
      "Habiganj Sadar", "Lakhai", "Madhabpur", "Nabiganj", "Sayestaganj",
    ],
    Moulvibazar: [
      "Barlekha", "Juri", "Kamalganj", "Kulaura",
      "Moulvibazar Sadar", "Rajnagar", "Sreemangal",
    ],
    Sunamganj: [
      "Bishwamvarpur", "Chhatak", "Derai", "Dharmapasha", "Dowarabazar",
      "Jagannathpur", "Jamalganj", "Shalla", "South Sunamganj",
      "Sunamganj Sadar", "Tahirpur",
    ],
    Sylhet: [
      "Balaganj", "Beanibazar", "Bishwanath", "Companiganj", "Dakshin Surma",
      "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat",
      "Osmani Nagar", "South Surma", "Sylhet Sadar",
    ],
  },

  Rangpur: {
    Dinajpur: [
      "Birampur", "Birganj", "Biral", "Bochaganj", "Chirirbandar",
      "Dinajpur Sadar", "Fulbari", "Ghoraghat", "Hakimpur",
      "Kaharole", "Khansama", "Nawabganj", "Parbatipur",
    ],
    Gaibandha: [
      "Fulchhari", "Gaibandha Sadar", "Gobindaganj",
      "Palashbari", "Saghata", "Sadullapur", "Sundarganj",
    ],
    Kurigram: [
      "Bhurungamari", "Char Rajibpur", "Chilmari", "Kurigram Sadar",
      "Nageshwari", "Phulbari", "Rajarhat", "Raumari", "Ulipur",
    ],
    Lalmonirhat: ["Aditmari", "Hatibandha", "Kaliganj", "Lalmonirhat Sadar", "Patgram"],
    Nilphamari: [
      "Dimla", "Domar", "Jaldhaka", "Kishoreganj",
      "Nilphamari Sadar", "Saidpur",
    ],
    Panchagarh: ["Atwari", "Boda", "Debiganj", "Panchagarh Sadar", "Tetulia"],
    Rangpur: [
      "Badarganj", "Gangachara", "Kaunia", "Mithapukur",
      "Pirgachha", "Pirganj", "Rangpur Sadar", "Taraganj",
    ],
    Thakurgaon: [
      "Baliadangi", "Haripur", "Pirganj", "Ranisankail", "Thakurgaon Sadar",
    ],
  },

  Mymensingh: {
    Jamalpur: [
      "Baksiganj", "Dewanganj", "Islampur", "Jamalpur Sadar",
      "Madarganj", "Melandaha", "Sarishabari",
    ],
    Mymensingh: [
      "Bhaluka", "Dhobaura", "Fulbaria", "Gaffargaon", "Gauripur",
      "Haluaghat", "Ishwarganj", "Muktagachha", "Mymensingh Sadar",
      "Nandail", "Phulpur", "Trishal",
    ],
    Netrokona: [
      "Atpara", "Barhatta", "Durgapur", "Kalmakanda", "Kendua",
      "Khaliajuri", "Madan", "Mohanganj", "Netrokona Sadar", "Purbadhala",
    ],
    Sherpur: ["Jhenaigati", "Nakla", "Nalitabari", "Sherpur Sadar", "Sreebardi"],
  },
};
