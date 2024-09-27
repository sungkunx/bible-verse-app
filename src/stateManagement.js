export const initialState = {
    categories: [],
    subcategories: [],
    verses: [],
    currentSubcategory: null,
    navigationLevel: 'categories',
    completedVerses: [],
    favorites: [],
    isKorean: true,
    gameMode: false,
    currentVerse: null,
    userInput: '',
    accuracy: null,
    peekCount: 0,
    checkCount: 0,
    isCompleted: false,
    viewMode: 'normal',
    selectedCategories: [],
    selectedSubcategories: [],
    showRangeSettings: false,
  };
  
  export const reducer = (state, action) => {
    switch (action.type) {
      case 'SET_CATEGORIES':
        return { ...state, categories: action.payload };
      case 'SET_SUBCATEGORIES':
        return { ...state, subcategories: action.payload };
      case 'SET_VERSES':
        return { ...state, verses: action.payload, currentSubcategory: action.subcategory };
      case 'SET_NAVIGATION_LEVEL':
        return { ...state, navigationLevel: action.payload };
      case 'TOGGLE_COMPLETED':
        const newCompletedVerses = state.completedVerses.includes(action.payload)
          ? state.completedVerses.filter(id => id !== action.payload)
          : [...state.completedVerses, action.payload];
        localStorage.setItem('completedVerses', JSON.stringify(newCompletedVerses));
        return { ...state, completedVerses: newCompletedVerses };
      case 'TOGGLE_FAVORITE':
        const newFavorites = state.favorites.includes(action.payload)
          ? state.favorites.filter(id => id !== action.payload)
          : [...state.favorites, action.payload];
        localStorage.setItem('favorites', JSON.stringify(newFavorites));
        return { ...state, favorites: newFavorites };
      case 'TOGGLE_LANGUAGE':
        return { ...state, isKorean: !state.isKorean };
      case 'LOAD_SAVED_DATA':
        return { ...state, ...action.payload };
      case 'START_GAME':
        return { ...state, gameMode: true, currentVerse: action.payload, userInput: '', accuracy: null, isCompleted: false, peekCount: 0, checkCount: 0 };
      case 'EXIT_GAME':
        return { ...state, gameMode: false, currentVerse: null, userInput: '', accuracy: null, isCompleted: false };
      case 'SET_USER_INPUT':
        return { ...state, userInput: action.payload };
      case 'SET_ACCURACY':
        return { ...state, accuracy: action.payload };
      case 'SET_PEEK_COUNT':
        return { ...state, peekCount: action.payload };
      case 'SET_CHECK_COUNT':
        return { ...state, checkCount: action.payload };
      case 'SET_COMPLETED':
        return { ...state, isCompleted: action.payload };
      case 'SET_VIEW_MODE':
        return { ...state, viewMode: action.payload };
      case 'SET_SELECTED_CATEGORIES':
        return { ...state, selectedCategories: action.payload };
      case 'SET_SELECTED_SUBCATEGORIES':
        return { ...state, selectedSubcategories: action.payload };
      case 'TOGGLE_RANGE_SETTINGS':
        return { ...state, showRangeSettings: !state.showRangeSettings };
      default:
        return state;
    }
  };