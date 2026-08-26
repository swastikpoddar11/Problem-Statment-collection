// In-memory mock database for development and testing without requiring live Google Cloud credentials

export const mockTeams = [
  {
    teamId: 'T101',
    teamName: 'Team Alpha',
    teamLeader: 'Rahul Sharma',
    usn: '1RV21CS045',
    phone: '9876543210',
    members: 'Rahul Sharma (Lead), Ananya Rao (1RV21CS012), Rohan Verma (1RV21CS078)',
    college: 'RV College of Engineering',
    track: 'AI & Emerging Tech',
    status: 'Verified'
  },
  {
    teamId: 'T102',
    teamName: 'Nexus Coders',
    teamLeader: 'Priya Patel',
    usn: '1MS21IS089',
    phone: '9123456780',
    members: 'Priya Patel (Lead), Sneha K (1MS21IS099), Vignesh S (1MS21IS112)',
    college: 'M.S. Ramaiah Institute of Technology',
    track: 'Cybersecurity & Cloud',
    status: 'Verified'
  },
  {
    teamId: 'T103',
    teamName: 'CyberKnights',
    teamLeader: 'Aarav Gupta',
    usn: '1PE21EC034',
    phone: '9988776655',
    members: 'Aarav Gupta (Lead), Ishita Sen (1PE21EC040), Varun Mehta (1PE21EC091)',
    college: 'PES University',
    track: 'IoT & Smart Hardware',
    status: 'Verified'
  },
  {
    teamId: 'T104',
    teamName: 'BioSync Innovators',
    teamLeader: 'Divya Nair',
    usn: '1BM21BT015',
    phone: '9445566778',
    members: 'Divya Nair (Lead), Karthik R (1BM21BT022), Neha Joshi (1BM21BT048)',
    college: 'BMS College of Engineering',
    track: 'Healthcare & MedTech',
    status: 'Verified'
  },
  {
    teamId: 'T105',
    teamName: 'Quantum Leap',
    teamLeader: 'Aditya Kulkarni',
    usn: '1DS21CS101',
    phone: '9811223344',
    members: 'Aditya Kulkarni (Lead), Tanya Roy (1DS21CS145)',
    college: 'Dayananda Sagar College of Engineering',
    track: 'Education & EdTech',
    status: 'Verified'
  }
];

export const mockProblemStatements = [
  {
    psId: 'PS001',
    theme: 'AI & Automation',
    problemStatement: 'AI Student Assistant for Adaptive Learning Paths',
    category: 'AI Assistant',
    description: 'Design a personalized conversational AI copilot that assesses student learning pace and automatically generates adaptive quiz modules and visual concept graphs.',
    status: 'Active'
  },
  {
    psId: 'PS002',
    theme: 'AI & Automation',
    problemStatement: 'Intelligent Document Processing & Multi-Lingual Extraction',
    category: 'Automation',
    description: 'Build an automated pipeline to extract structured data from scanned legal and financial documents across 5+ regional Indian languages with high OCR fidelity.',
    status: 'Active'
  },
  {
    psId: 'PS003',
    theme: 'AI & Automation',
    problemStatement: 'AI Campus Security & Anomaly Detection',
    category: 'Computer Vision',
    description: 'Implement real-time edge CCTV stream analysis for crowd surge prediction, unattended object detection, and emergency lane obstruction alerts.',
    status: 'Active'
  },
  {
    psId: 'PS004',
    theme: 'IoT & Smart Cities',
    problemStatement: 'Smart Grid Energy Optimization with Edge LoRaWAN',
    category: 'Smart Energy',
    description: 'Create an intelligent low-power IoT network for monitoring transformer loads and dynamically shedding non-critical public utility power during peak hours.',
    status: 'Active'
  },
  {
    psId: 'PS005',
    theme: 'IoT & Smart Cities',
    problemStatement: 'Intelligent Urban Flood Monitoring & Early Warning System',
    category: 'Smart Infrastructure',
    description: 'Deploy ultrasonic water-level sensors in stormwater drains linked to real-time geospatial alerts for city traffic management.',
    status: 'Active'
  },
  {
    psId: 'PS006',
    theme: 'Cybersecurity',
    problemStatement: 'Zero-Trust Identity Verification for Distributed APIs',
    category: 'Cyber Defense',
    description: 'Develop an automated behavioral anomaly scoring engine to detect credential stuffing and token theft in high-throughput cloud microservices.',
    status: 'Active'
  },
  {
    psId: 'PS007',
    theme: 'Cybersecurity',
    problemStatement: 'Phishing & Deepfake Audio Threat Interceptor',
    category: 'Threat Intelligence',
    description: 'Build a lightweight browser and telecom gateway plugin that detects synthetic voice cloning and spoofed domains in real-time.',
    status: 'Active'
  },
  {
    psId: 'PS008',
    theme: 'Healthcare & MedTech',
    problemStatement: 'Remote Patient Triage & Early Sepsis Warning Engine',
    category: 'Health Tech',
    description: 'An AI-assisted vital signs monitoring dashboard that alerts rural clinic health workers about early deterioration markers.',
    status: 'Active'
  },
  {
    psId: 'PS009',
    theme: 'Healthcare & MedTech',
    problemStatement: 'Prescription Verification & Drug Interaction Analyzer',
    category: 'Clinical Safety',
    description: 'A mobile OCR tool to digitize handwritten medical prescriptions and warn pharmacists of adverse drug-drug interactions.',
    status: 'Active'
  },
  {
    psId: 'PS010',
    theme: 'Education & EdTech',
    problemStatement: 'Gamified Peer Code Review & Skill Verification Platform',
    category: 'EdTech',
    description: 'A collaborative platform that matches peer reviewers based on mastery levels, providing automated rubrics and gamified badges.',
    status: 'Active'
  }
];

export const mockSubmissions = [
  // Seed with one existing submission for T105 to test duplicate protection right away
  {
    timestamp: '2026-08-20T14:30:00.000Z',
    teamId: 'T105',
    teamName: 'Quantum Leap',
    leader: 'Aditya Kulkarni',
    psId: 'PS010',
    theme: 'Education & EdTech',
    problemStatement: 'Gamified Peer Code Review & Skill Verification Platform',
    category: 'EdTech',
    submissionStatus: 'Submitted'
  }
];
