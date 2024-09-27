import versesData from './verses.json';

export const getVerseId = (verse) => `${verse.subcategory}-${verse.number}`;

export const calculateAccuracy = (verse, userInput, isKorean) => {
  if (!verse) return 0;
  const words = (isKorean ? verse.koreanText : verse.englishText).split(' ');
  const userWords = userInput.split(' ');
  let correctWords = 0;

  words.forEach((word, index) => {
    if (word.toLowerCase() === (userWords[index] || '').toLowerCase()) {
      correctWords++;
    }
  });

  return Math.round((correctWords / words.length) * 100);
};

export const getRandomVerse = (selectedCategories, selectedSubcategories) => {
  let filteredVerses = versesData;
  if (selectedCategories.length > 0) {
    filteredVerses = filteredVerses.filter(verse => selectedCategories.includes(verse.category));
  }
  if (selectedSubcategories.length > 0) {
    filteredVerses = filteredVerses.filter(verse => selectedSubcategories.includes(verse.subcategory));
  }
  return filteredVerses[Math.floor(Math.random() * filteredVerses.length)];
};