/** === Life Path Meaning === */
export const getLifePathMeaning = (num: number): string => {
  const meanings: Record<number, string> = {
    1: `🌟 **Life Path 1 — The Independent Leader**
    You are born to stand at the front. You thrive when forging your own path, guided by ambition and originality.
    Your purpose is to inspire others through courage and determination.
    Be careful not to become overly stubborn or isolated — leadership shines brightest when you lift others with you.`,

    2: `🤝 **Life Path 2 — The Peacemaker**
    Your strength lies in harmony, diplomacy, and deep empathy.
    You have a natural gift for understanding people and bridging differences.
    Your mission is to bring balance and emotional intelligence into the world.
    Remember: being kind doesn’t mean being weak — your gentleness is your true power.`,

    3: `🎨 **Life Path 3 — The Creative Communicator**
    You are a natural artist — expressive, optimistic, and full of imagination.
    Your words and ideas have the power to heal and inspire.
    Your challenge is to focus your energy, as your mind is always bursting with possibilities.
    When you speak from your heart, others listen.`,

    4: `🏗️ **Life Path 4 — The Builder**
    Structure, stability, and discipline define your path.
    You find meaning in creating systems that last — whether in business, family, or society.
    You are dependable and hardworking, but don’t let practicality block your dreams.
    Build not just with your hands, but with vision and faith.`,

    5: `🌪️ **Life Path 5 — The Freedom Seeker**
    You crave change, adventure, and experience.
    Routine suffocates you — your spirit needs space to explore.
    Your gift is adaptability, your curse is restlessness.
    You are here to remind others that life is meant to be lived fully, not feared.`,

    6: `💞 **Life Path 6 — The Nurturer**
    You are the heart of your community — compassionate, loyal, and protective.
    Family, love, and service are sacred to you.
    You bring healing energy wherever you go, but don’t lose yourself in others’ problems.
    Learn to nurture yourself as deeply as you nurture everyone else.`,

    7: `🔮 **Life Path 7 — The Seeker of Truth**
    You are a mystic at heart — analytical yet deeply spiritual.
    You’re drawn to knowledge, philosophy, and the mysteries of life.
    Solitude recharges you, but don’t let it turn into isolation.
    Your purpose is to merge intellect with intuition — to discover truth beyond appearances.`,

    8: `💰 **Life Path 8 — The Power Manifestor**
    You are meant to master the material world — leadership, money, and influence come naturally.
    You understand systems and how to make them work.
    Use your ambition wisely — when driven by integrity, you uplift everyone around you.
    You are proof that spirituality and success can coexist.`,

    9: `🌍 **Life Path 9 — The Humanitarian**
    Your heart beats for humanity.
    You carry wisdom, compassion, and a sense of universal love that transcends boundaries.
    Your journey is one of letting go — of learning to forgive and release what no longer serves.
    Through kindness and art, you bring healing to the world.`,

    11: `⚡ **Life Path 11 — The Illuminator**
    You are a channel for inspiration — intuitive, visionary, and sensitive.
    Your presence awakens others.
    Life may test you early, but through those trials, you gain spiritual strength.
    You’re meant to light the way for others, even when your own path feels uncertain.`,

    22: `🏰 **Life Path 22 — The Master Builder**
    You possess the rare ability to turn dreams into tangible reality.
    Your potential is vast — practical like a 4, yet visionary like an 11.
    Your challenge is self-belief: once you trust your purpose, you can manifest greatness that benefits generations.`,

    33: `🌈 **Life Path 33 — The Master Teacher**
    You embody unconditional love.
    You are here to uplift others through compassion, creativity, and service.
    Your path is not easy — your sensitivity is both gift and burden — but when you embrace it, you radiate divine kindness.
    You heal by simply being who you are.`,
  };

  return meanings[num] || "✨ Your Life Path is unique — a blend of energies that make you one of a kind.";
};

/** === Western Zodiac === */
export const getZodiacSign = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;

  const signs = [
    { sign: "Capricorn", start: [12, 22], end: [1, 19] },
    { sign: "Aquarius", start: [1, 20], end: [2, 18] },
    { sign: "Pisces", start: [2, 19], end: [3, 20] },
    { sign: "Aries", start: [3, 21], end: [4, 19] },
    { sign: "Taurus", start: [4, 20], end: [5, 20] },
    { sign: "Gemini", start: [5, 21], end: [6, 20] },
    { sign: "Cancer", start: [6, 21], end: [7, 22] },
    { sign: "Leo", start: [7, 23], end: [8, 22] },
    { sign: "Virgo", start: [8, 23], end: [9, 22] },
    { sign: "Libra", start: [9, 23], end: [10, 22] },
    { sign: "Scorpio", start: [10, 23], end: [11, 21] },
    { sign: "Sagittarius", start: [11, 22], end: [12, 21] },
  ];

  const sign = signs.find(({ start, end }) => {
    if (month === start[0] && day >= start[1]) return true;
    if (month === end[0] && day <= end[1]) return true;
    return false;
  });

  return sign?.sign ?? "Unknown";
};

/** === Local Zodiac Fortunes === */
export const localFortunes: Record<string, any> = {
  Aries: {
    mood: "Energetic",
    compatibility: "Leo",
    description: "Today brings you a rush of energy. Take bold steps toward your goals!",
  },
  Taurus: {
    mood: "Calm",
    compatibility: "Virgo",
    description: "You feel grounded today. Focus on practical matters and comfort.",
  },
  Gemini: {
    mood: "Curious",
    compatibility: "Libra",
    description: "Communication flows easily. A great day to learn or teach something new.",
  },
  Cancer: {
    mood: "Emotional",
    compatibility: "Pisces",
    description: "Your heart leads the way. Connect deeply with those you love.",
  },
  Leo: {
    mood: "Confident",
    compatibility: "Sagittarius",
    description: "You shine today. Step into the spotlight and express yourself.",
  },
  Virgo: {
    mood: "Analytical",
    compatibility: "Taurus",
    description: "Pay attention to the details. Small improvements bring big results.",
  },
  Libra: {
    mood: "Balanced",
    compatibility: "Gemini",
    description: "Seek harmony in relationships and make time for beauty around you.",
  },
  Scorpio: {
    mood: "Intense",
    compatibility: "Cancer",
    description: "Passion runs deep today. Trust your instincts and follow transformation.",
  },
  Sagittarius: {
    mood: "Adventurous",
    compatibility: "Aries",
    description: "Take a leap of faith. The world rewards your curiosity.",
  },
  Capricorn: {
    mood: "Focused",
    compatibility: "Virgo",
    description: "You’re disciplined today. Stay consistent and success will follow.",
  },
  Aquarius: {
    mood: "Innovative",
    compatibility: "Gemini",
    description: "Think outside the box. Your ideas can inspire others today.",
  },
  Pisces: {
    mood: "Dreamy",
    compatibility: "Cancer",
    description: "Let your imagination lead. Art, music, and emotion flow easily.",
  },
};
