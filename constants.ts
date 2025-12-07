import { IPLTeam, Player } from './types';

export const IPL_TEAMS_CONFIG: Record<IPLTeam, { color: string; fullName: string; textColor: string }> = {
  [IPLTeam.CSK]: { color: 'bg-yellow-500', fullName: 'Chennai Super Kings', textColor: 'text-yellow-500' },
  [IPLTeam.MI]: { color: 'bg-blue-600', fullName: 'Mumbai Indians', textColor: 'text-blue-500' },
  [IPLTeam.RCB]: { color: 'bg-red-600', fullName: 'Royal Challengers Bengaluru', textColor: 'text-red-500' },
  [IPLTeam.KKR]: { color: 'bg-purple-700', fullName: 'Kolkata Knight Riders', textColor: 'text-purple-400' },
  [IPLTeam.SRH]: { color: 'bg-orange-500', fullName: 'Sunrisers Hyderabad', textColor: 'text-orange-500' },
  [IPLTeam.RR]: { color: 'bg-pink-600', fullName: 'Rajasthan Royals', textColor: 'text-pink-500' },
  [IPLTeam.DC]: { color: 'bg-blue-500', fullName: 'Delhi Capitals', textColor: 'text-blue-400' },
  [IPLTeam.PBKS]: { color: 'bg-red-500', fullName: 'Punjab Kings', textColor: 'text-red-500' },
  [IPLTeam.LSG]: { color: 'bg-cyan-600', fullName: 'Lucknow Super Giants', textColor: 'text-cyan-500' },
  [IPLTeam.GT]: { color: 'bg-teal-700', fullName: 'Gujarat Titans', textColor: 'text-teal-500' },
};

// Helper to create initial player objects
const createPlayer = (id: number, name: string, iplTeam: IPLTeam, smatTeam: string): Player => ({
  id: id.toString(),
  name,
  iplTeam,
  smatTeam,
  role: 'Unknown',
  stats: {
    matches: 0,
    lastUpdated: '',
  }
});

// Full Roster from CSV (NA filtered out)
export const INITIAL_PLAYERS: Player[] = [
  // CSK
  createPlayer(1, 'Anshul Kamboj', IPLTeam.CSK, 'Haryana'),
  createPlayer(2, 'Gurjapneet Singh', IPLTeam.CSK, 'Tamil Nadu'),
  createPlayer(3, 'Mukesh Choudhary', IPLTeam.CSK, 'Maharashtra'),
  createPlayer(4, 'Ramakrishna Ghosh', IPLTeam.CSK, 'Maharashtra'),
  createPlayer(5, 'Ruturaj Gaikwad', IPLTeam.CSK, 'Maharashtra'),
  createPlayer(6, 'Shivam Dube', IPLTeam.CSK, 'Mumbai'),
  createPlayer(7, 'Shreyas Gopal', IPLTeam.CSK, 'Karnataka'),
  createPlayer(8, 'Syed Khaleel Ahmed', IPLTeam.CSK, 'Rajasthan'),
  createPlayer(9, 'Ayush Mhatre', IPLTeam.CSK, 'Mumbai'),
  createPlayer(10, 'Urvil Patel', IPLTeam.CSK, 'Gujarat'),
  createPlayer(11, 'Sanju Samson', IPLTeam.CSK, 'Kerala'), // Note: CSV said CSK, keeping as per CSV provided
  
  // DC
  createPlayer(12, 'Abhishek Porel', IPLTeam.DC, 'Bengal'),
  createPlayer(13, 'Ajay Mandal', IPLTeam.DC, 'Chhattisgarh'),
  createPlayer(14, 'Ashutosh Sharma', IPLTeam.DC, 'Railways'),
  createPlayer(15, 'Axar Patel', IPLTeam.DC, 'Gujarat'),
  createPlayer(16, 'Karun Nair', IPLTeam.DC, 'Karnataka'),
  createPlayer(17, 'KL Rahul', IPLTeam.DC, 'Karnataka'),
  createPlayer(18, 'Kuldeep Yadav', IPLTeam.DC, 'Uttar Pradesh'),
  createPlayer(19, 'Madhav Tiwari', IPLTeam.DC, 'Madhya Pradesh'),
  createPlayer(20, 'Mukesh Kumar', IPLTeam.DC, 'Bengal'),
  createPlayer(21, 'Nitish Rana', IPLTeam.DC, 'Delhi'),
  createPlayer(22, 'Sameer Rizvi', IPLTeam.DC, 'Uttar Pradesh'),
  createPlayer(23, 'T. Natarajan', IPLTeam.DC, 'Tamil Nadu'),
  createPlayer(24, 'Tripurana Vijay', IPLTeam.DC, 'Andhra'),
  createPlayer(25, 'Vipraj Nigam', IPLTeam.DC, 'Uttar Pradesh'),

  // GT
  createPlayer(26, 'Anuj Rawat', IPLTeam.GT, 'Delhi'),
  createPlayer(27, 'Gurnoor Singh Brar', IPLTeam.GT, 'Punjab'),
  createPlayer(28, 'Ishant Sharma', IPLTeam.GT, 'Delhi'),
  createPlayer(29, 'Jayant Yadav', IPLTeam.GT, 'Puducherry'),
  createPlayer(30, 'Kumar Kushagra', IPLTeam.GT, 'Jharkhand'),
  createPlayer(31, 'Manav Suthar', IPLTeam.GT, 'Rajasthan'),
  createPlayer(32, 'Mohammad Siraj', IPLTeam.GT, 'Hyderabad'),
  createPlayer(33, 'Mohd. Arshad Khan', IPLTeam.GT, 'Madhya Pradesh'),
  createPlayer(34, 'Nishant Sindhu', IPLTeam.GT, 'Haryana'),
  createPlayer(35, 'Prasidh Krishna', IPLTeam.GT, 'Karnataka'),
  createPlayer(36, 'R. Sai Kishore', IPLTeam.GT, 'Tamil Nadu'),
  createPlayer(37, 'Rahul Tewatia', IPLTeam.GT, 'Haryana'),
  createPlayer(38, 'Sai Sudharsan', IPLTeam.GT, 'Tamil Nadu'),
  createPlayer(39, 'Shahrukh Khan', IPLTeam.GT, 'Tamil Nadu'),
  createPlayer(40, 'Shubman Gill', IPLTeam.GT, 'Punjab'),
  createPlayer(41, 'Washington Sundar', IPLTeam.GT, 'Tamil Nadu'),

  // KKR
  createPlayer(42, 'Ajinkya Rahane', IPLTeam.KKR, 'Mumbai'),
  createPlayer(43, 'Angkrish Raghuvanshi', IPLTeam.KKR, 'Mumbai'),
  createPlayer(44, 'Anukul Roy', IPLTeam.KKR, 'Jharkhand'),
  createPlayer(45, 'Harshit Rana', IPLTeam.KKR, 'Delhi'),
  createPlayer(46, 'Ramandeep Singh', IPLTeam.KKR, 'Punjab'),
  createPlayer(47, 'Rinku Singh', IPLTeam.KKR, 'Uttar Pradesh'),
  createPlayer(48, 'Umran Malik', IPLTeam.KKR, 'J & K'),
  createPlayer(49, 'Vaibhav Arora', IPLTeam.KKR, 'Himachal Pradesh'),
  createPlayer(50, 'Varun Chakaravarthy', IPLTeam.KKR, 'Tamil Nadu'),

  // LSG
  createPlayer(51, 'Abdul Samad', IPLTeam.LSG, 'J & K'),
  createPlayer(52, 'Akash Singh', IPLTeam.LSG, 'Rajasthan'),
  createPlayer(53, 'Arjun Tendulkar', IPLTeam.LSG, 'Goa'),
  createPlayer(54, 'Arshin Kulkarni', IPLTeam.LSG, 'Maharashtra'),
  createPlayer(55, 'Avesh Khan', IPLTeam.LSG, 'Delhi'),
  createPlayer(56, 'Ayush Badoni', IPLTeam.LSG, 'Delhi'),
  createPlayer(57, 'Digvesh Rathi', IPLTeam.LSG, 'Delhi'),
  createPlayer(58, 'Himmat Singh', IPLTeam.LSG, 'Delhi'),
  createPlayer(59, 'Manimaran Siddharth', IPLTeam.LSG, 'Tamil Nadu'),
  createPlayer(60, 'Md Shami', IPLTeam.LSG, 'Bengal'),
  createPlayer(61, 'Mohsin Khan', IPLTeam.LSG, 'Uttar Pradesh'),
  createPlayer(62, 'Prince Yadav', IPLTeam.LSG, 'Delhi'),
  createPlayer(63, 'Rishabh Pant', IPLTeam.LSG, 'Delhi'),
  createPlayer(64, 'Shahbaz Ahmed', IPLTeam.LSG, 'Bengal'),

  // MI
  createPlayer(65, 'Ashwani Kumar', IPLTeam.MI, 'Punjab'),
  createPlayer(66, 'Deepak Chahar', IPLTeam.MI, 'Rajasthan'),
  createPlayer(67, 'Hardik Pandya', IPLTeam.MI, 'Baroda'),
  createPlayer(68, 'Jasprit Bumrah', IPLTeam.MI, 'Gujarat'),
  createPlayer(69, 'Mayank Markande', IPLTeam.MI, 'Punjab'),
  createPlayer(70, 'Naman Dhir', IPLTeam.MI, 'Punjab'),
  createPlayer(71, 'Raghu Sharma', IPLTeam.MI, 'Punjab'),
  createPlayer(72, 'Raj Angad Bawa', IPLTeam.MI, 'Chandigarh'),
  createPlayer(73, 'Robin Minz', IPLTeam.MI, 'Jharkhand'),
  createPlayer(74, 'Rohit Sharma', IPLTeam.MI, 'Mumbai'),
  createPlayer(75, 'Shardul Thakur', IPLTeam.MI, 'Mumbai'),
  createPlayer(76, 'Suryakumar Yadav', IPLTeam.MI, 'Mumbai'),
  createPlayer(77, 'Tilak Verma', IPLTeam.MI, 'Hyderabad'),

  // PBKS
  createPlayer(78, 'Arshdeep Singh', IPLTeam.PBKS, 'Punjab'),
  createPlayer(79, 'Harnoor Pannu', IPLTeam.PBKS, 'Punjab'),
  createPlayer(80, 'Harpreet Brar', IPLTeam.PBKS, 'Punjab'),
  createPlayer(81, 'Musheer Khan', IPLTeam.PBKS, 'Mumbai'),
  createPlayer(82, 'Nehal Wadhera', IPLTeam.PBKS, 'Punjab'),
  createPlayer(83, 'Prabhsimran Singh', IPLTeam.PBKS, 'Punjab'),
  createPlayer(84, 'Priyansh Arya', IPLTeam.PBKS, 'Delhi'),
  createPlayer(85, 'Pyla Avinash', IPLTeam.PBKS, 'Andhra'),
  createPlayer(86, 'Shashank Singh', IPLTeam.PBKS, 'Chhattisgarh'),
  createPlayer(87, 'Shreyas Iyer', IPLTeam.PBKS, 'Mumbai'),
  createPlayer(88, 'Suryansh Shedge', IPLTeam.PBKS, 'Mumbai'),
  createPlayer(89, 'Vishnu Vinod', IPLTeam.PBKS, 'Kerala'),
  createPlayer(90, 'Vyshak Vijaykumar', IPLTeam.PBKS, 'Karnataka'),
  createPlayer(91, 'Yash Thakur', IPLTeam.PBKS, 'Vidarbha'),
  createPlayer(92, 'Yuzvendra Chahal', IPLTeam.PBKS, 'Haryana'),

  // RR
  createPlayer(93, 'Dhruv Jurel', IPLTeam.RR, 'Uttar Pradesh'),
  createPlayer(94, 'Ravindra Jadeja', IPLTeam.RR, 'Saurashtra'),
  createPlayer(95, 'Riyan Parag', IPLTeam.RR, 'Assam'),
  createPlayer(96, 'Sandeep Sharma', IPLTeam.RR, 'Chandigarh'),
  createPlayer(97, 'Shubham Dubey', IPLTeam.RR, 'Vidarbha'),
  createPlayer(98, 'Tushar Deshpande', IPLTeam.RR, 'Mumbai'),
  createPlayer(99, 'Vaibhav Suryavanshi', IPLTeam.RR, 'Bihar'),
  createPlayer(100, 'Yashaswi Jaiswal', IPLTeam.RR, 'Mumbai'),
  createPlayer(101, 'Yudhvir Charak', IPLTeam.RR, 'J & K'),

  // RCB
  createPlayer(102, 'Bhuvneshwar Kumar', IPLTeam.RCB, 'Uttar Pradesh'),
  createPlayer(103, 'Devdutt Padikkal', IPLTeam.RCB, 'Karnataka'),
  createPlayer(104, 'Jitesh Sharma', IPLTeam.RCB, 'Baroda'),
  createPlayer(105, 'Krunal Pandya', IPLTeam.RCB, 'Baroda'),
  createPlayer(106, 'Rajat Patidar', IPLTeam.RCB, 'Madhya Pradesh'),
  createPlayer(107, 'Rasikh Dar', IPLTeam.RCB, 'Baroda'),
  createPlayer(108, 'Suyash Sharma', IPLTeam.RCB, 'Delhi'),
  createPlayer(109, 'Swapnil Singh', IPLTeam.RCB, 'Tripura'),
  createPlayer(110, 'Yash Dayal', IPLTeam.RCB, 'Uttar Pradesh'),

  // SRH
  createPlayer(111, 'Abhishek Sharma', IPLTeam.SRH, 'Punjab'),
  createPlayer(112, 'Aniket Verma', IPLTeam.SRH, 'Madhya Pradesh'),
  createPlayer(113, 'Harsh Dubey', IPLTeam.SRH, 'Vidarbha'),
  createPlayer(114, 'Harshal Patel', IPLTeam.SRH, 'Gujarat'),
  createPlayer(115, 'Ishan Kishan', IPLTeam.SRH, 'Jharkhand'),
  createPlayer(116, 'Jaydev Unadkat', IPLTeam.SRH, 'Saurashtra'),
  createPlayer(117, 'Nitish Kumar Reddy', IPLTeam.SRH, 'Andhra'),
  createPlayer(118, 'Smaran Ravichandaran', IPLTeam.SRH, 'Karnataka'),
  createPlayer(119, 'Zeeshan Ansari', IPLTeam.SRH, 'Uttar Pradesh'),
];
