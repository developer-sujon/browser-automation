/**
 * Data Generator for Contact Forms
 */

export const dataGenerator = {
  firstNames: [
    "আহমেদ",
    "রহিম",
    "করিম",
    "সালাম",
    "জামাল",
    "কামাল",
    "রফিক",
    "শফিক",
    "তারেক",
    "সাদিক",
    "নাসির",
    "বাশির",
    "মনির",
    "সাকিব",
  ],

  lastNames: [
    "রহমান",
    "আহমেদ",
    "ইসলাম",
    "হোসেন",
    "আলী",
    "খান",
    "চৌধুরী",
    "মিয়া",
    "শেখ",
    "হক",
    "মল্লিক",
    "সরকার",
  ],

  phoneOperators: ["017", "013", "014", "015", "016", "018", "019"],

  emailDomains: ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"],

  messageTemplates: [
    "আসসালামু আলাইকুম, আমি আপনার সেবা সম্পর্কে জানতে আগ্রহী।",
    "Hello, I would like to discuss a potential project with you.",
    "Hi, I came across your portfolio and I'm impressed. Can we connect?",
    "Good day! I need assistance with web development services.",
    "Greetings! I am looking for a skilled developer for my project.",
  ],

  generatePhone(): string {
    const operator = this.pick(this.phoneOperators);
    const number = Math.floor(10000000 + Math.random() * 90000000);
    return `+88${operator}${number}`;
  },

  generateEmail(firstName: string, lastName: string): string {
    const first = this.transliterate(firstName).toLowerCase();
    const last = this.transliterate(lastName).toLowerCase();
    const domain = this.pick(this.emailDomains);
    const num = Math.floor(Math.random() * 999) + 1;

    const patterns = [
      `${first}${num}@${domain}`,
      `${first}.${last}@${domain}`,
      `${last}${first}@${domain}`,
    ];

    return this.pick(patterns);
  },

  transliterate(text: string): string {
    const map: Record<string, string> = {
      আহমেদ: "ahmed",
      রহিম: "rahim",
      করিম: "karim",
      সালাম: "salam",
      জামাল: "jamal",
      কামাল: "kamal",
      রফিক: "rafiq",
      শফিক: "shafiq",
      তারেক: "tarek",
      সাদিক: "sadiq",
      নাসির: "nasir",
      বাশির: "bashir",
      মনির: "monir",
      সাকিব: "sakib",
      রহমান: "rahman",
      ইসলাম: "islam",
      হোসেন: "hosen",
      আলী: "ali",
      খান: "khan",
      চৌধুরী: "chowdhury",
      মিয়া: "mia",
      শেখ: "sheikh",
      হক: "haque",
      মল্লিক: "mallick",
      সরকার: "sarkar",
    };
    return map[text] || text;
  },

  getPerson() {
    const firstName = this.pick(this.firstNames);
    const lastName = this.pick(this.lastNames);

    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      phone: this.generatePhone(),
      email: this.generateEmail(firstName, lastName),
      message: this.pick(this.messageTemplates),
    };
  },

  pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  },
};

export const random = {
  delay: (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min,
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
