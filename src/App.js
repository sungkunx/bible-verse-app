import React, { useReducer, useEffect, useCallback, useMemo, useState } from 'react';
import { Button, Card, CardContent, Typography, TextField, FormGroup, FormControlLabel, Switch, Collapse } from '@mui/material';
import { Star, Check, Globe, ChevronLeft, Home, Gamepad, Eye, Shuffle, Settings } from 'lucide-react';

import versesData from './verses.json';

const getVerseId = (verse) => `${verse.subcategory}-${verse.number}`;

const reducer = (state, action) => {
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

const initialState = {
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

const BibleVerseApp = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showVerse, setShowVerse] = useState(false);

  useEffect(() => {
    const categories = [...new Set(versesData.map(verse => verse.category))];
    const subcategories = [...new Set(versesData.map(verse => verse.subcategory))];
    dispatch({ type: 'SET_CATEGORIES', payload: categories });
    dispatch({ type: 'SET_SUBCATEGORIES', payload: subcategories });

    try {
      const storedCompleted = JSON.parse(localStorage.getItem('completedVerses')) || [];
      const storedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
      dispatch({ type: 'LOAD_SAVED_DATA', payload: { completedVerses: storedCompleted, favorites: storedFavorites } });
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }, []);

  const handleCategoryClick = useCallback((category) => {
    const subcategories = [...new Set(versesData.filter(verse => verse.category === category).map(verse => verse.subcategory))];
    dispatch({ type: 'SET_SUBCATEGORIES', payload: subcategories });
    dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'subcategories' });
  }, []);

  const handleSubcategoryClick = useCallback((subcategory) => {
    const verses = versesData.filter(verse => verse.subcategory === subcategory).sort((a, b) => a.number - b.number);
    dispatch({ type: 'SET_VERSES', payload: verses, subcategory });
    dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'verses' });
  }, []);

  const handleCategorySelect = useCallback((category) => {
    const updatedCategories = state.selectedCategories.includes(category)
      ? state.selectedCategories.filter(cat => cat !== category)
      : [...state.selectedCategories, category];
    
    dispatch({ type: 'SET_SELECTED_CATEGORIES', payload: updatedCategories });

    const categorySubcategories = versesData
      .filter(verse => verse.category === category)
      .map(verse => verse.subcategory);
    
    let updatedSubcategories;
    if (updatedCategories.includes(category)) {
      updatedSubcategories = [...new Set([...state.selectedSubcategories, ...categorySubcategories])];
    } else {
      updatedSubcategories = state.selectedSubcategories.filter(subcat => !categorySubcategories.includes(subcat));
    }
    
    dispatch({ type: 'SET_SELECTED_SUBCATEGORIES', payload: updatedSubcategories });
  }, [state.selectedCategories, state.selectedSubcategories]);

  const handleSubcategorySelect = useCallback((subcategory) => {
    const updatedSubcategories = state.selectedSubcategories.includes(subcategory)
      ? state.selectedSubcategories.filter(subcat => subcat !== subcategory)
      : [...state.selectedSubcategories, subcategory];
    
    dispatch({ type: 'SET_SELECTED_SUBCATEGORIES', payload: updatedSubcategories });

    const subcategoryCategory = versesData.find(verse => verse.subcategory === subcategory)?.category;
    const categorySubcategories = versesData
      .filter(verse => verse.category === subcategoryCategory)
      .map(verse => verse.subcategory);
    
    const allCategorySubcategoriesSelected = categorySubcategories.every(subcat => updatedSubcategories.includes(subcat));
    
    let updatedCategories;
    if (allCategorySubcategoriesSelected) {
      updatedCategories = [...new Set([...state.selectedCategories, subcategoryCategory])];
    } else {
      updatedCategories = state.selectedCategories.filter(cat => cat !== subcategoryCategory);
    }
    
    dispatch({ type: 'SET_SELECTED_CATEGORIES', payload: updatedCategories });
  }, [state.selectedCategories, state.selectedSubcategories]);

  const handleComplete = useCallback((verse) => {
    const verseId = getVerseId(verse);
    dispatch({ type: 'TOGGLE_COMPLETED', payload: verseId });
  }, []);

  const handleFavorite = useCallback((verse) => {
    const verseId = getVerseId(verse);
    dispatch({ type: 'TOGGLE_FAVORITE', payload: verseId });
  }, []);

  const toggleLanguage = useCallback(() => {
    dispatch({ type: 'TOGGLE_LANGUAGE' });
  }, []);

  const goBack = useCallback(() => {
    if (state.navigationLevel === 'subcategories') {
      dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'categories' });
    } else if (state.navigationLevel === 'verses') {
      dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'subcategories' });
    }
    dispatch({ type: 'SET_VIEW_MODE', payload: 'normal' });
  }, [state.navigationLevel]);

  const goHome = useCallback(() => {
    dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'categories' });
    dispatch({ type: 'SET_VIEW_MODE', payload: 'normal' });
    if (state.gameMode) {
      dispatch({ type: 'EXIT_GAME' });
    }
  }, [state.gameMode]);

  const startGame = useCallback((verse) => {
    dispatch({ type: 'START_GAME', payload: verse });
  }, []);

  const exitGame = useCallback(() => {
    dispatch({ type: 'EXIT_GAME' });
    dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'verses' });
  }, []);

  const handleInputChange = useCallback((e) => {
    dispatch({ type: 'SET_USER_INPUT', payload: e.target.value });
  }, []);

  const calculateAccuracy = (verse, userInput, isKorean) => {
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

  const handlePeek = useCallback(() => {
    setShowVerse(true);
    setTimeout(() => setShowVerse(false), 1500);
    dispatch({ type: 'SET_PEEK_COUNT', payload: state.peekCount + 1 });
  }, [state.peekCount]);

  const handleCheck = useCallback(() => {
    const accuracy = calculateAccuracy(state.currentVerse, state.userInput, state.isKorean);
    dispatch({ type: 'SET_ACCURACY', payload: accuracy });
    dispatch({ type: 'SET_CHECK_COUNT', payload: state.checkCount + 1 });
    if (accuracy === 100) {
      dispatch({ type: 'SET_COMPLETED', payload: true });
    }
  }, [state.currentVerse, state.userInput, state.isKorean, state.checkCount]);

  const getRandomVerse = useCallback(() => {
    let filteredVerses = versesData;
    if (state.selectedCategories.length > 0) {
      filteredVerses = filteredVerses.filter(verse => state.selectedCategories.includes(verse.category));
    }
    if (state.selectedSubcategories.length > 0) {
      filteredVerses = filteredVerses.filter(verse => state.selectedSubcategories.includes(verse.subcategory));
    }
    return filteredVerses[Math.floor(Math.random() * filteredVerses.length)];
  }, [state.selectedCategories, state.selectedSubcategories]);

  const startRandomGame = useCallback(() => {
    const randomVerse = getRandomVerse();
    dispatch({ type: 'START_GAME', payload: randomVerse });
  }, [getRandomVerse]);

  const handleRandomVerse = useCallback(() => {
    const randomVerse = getRandomVerse();
    dispatch({ type: 'START_GAME', payload: randomVerse });
  }, [getRandomVerse]);

  const setViewMode = useCallback((mode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
    if (mode === 'favorites' || mode === 'completed') {
      dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'verses' });
    }
  }, []);

  const toggleRangeSettings = useCallback(() => {
    dispatch({ type: 'TOGGLE_RANGE_SETTINGS' });
  }, []);

  const getSelectedRangeText = useCallback(() => {
    const selectedCategories = state.selectedCategories.length;
    const selectedSubcategories = state.selectedSubcategories.length;
    
    if (selectedCategories === 0 && selectedSubcategories === 0) {
      return '전체';
    }

    let text = '';
    if (selectedCategories > 0) {
      text += `${selectedCategories}개 카테고리`;
    }
    if (selectedSubcategories > 0) {
      if (text) text += ', ';
      text += `${selectedSubcategories}개 서브카테고리`;
    }
    return text + ' 선택됨';
  }, [state.selectedCategories, state.selectedSubcategories]);

  const renderGameControls = useMemo(() => (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Typography variant="subtitle1">선택된 범위: {getSelectedRangeText()}</Typography>
        <Button 
          onClick={toggleRangeSettings}
          variant="outlined"
          startIcon={<Settings />}
        >
          범위 설정
        </Button>
      </div>
      <Collapse in={state.showRangeSettings}>
        <FormGroup>
          <Typography variant="subtitle1">카테고리</Typography>
          {state.categories.map(category => (
            <FormControlLabel
              key={category}
              control={
                <Switch
                  checked={state.selectedCategories.includes(category)}
                  onChange={() => handleCategorySelect(category)}
                />
              }
              label={category}
            />
          ))}
          <Typography variant="subtitle1" style={{ marginTop: '1rem' }}>서브카테고리</Typography>
          {state.categories.map(category => (
            <div key={category}>
              <Typography variant="subtitle2">{category}</Typography>
              {state.subcategories
                .filter(subcategory => versesData.some(verse => verse.category === category && verse.subcategory === subcategory))
                .map(subcategory => (
                  <FormControlLabel
                    key={subcategory}
                    control={
                      <Switch
                        checked={state.selectedSubcategories.includes(subcategory)}
                        onChange={() => handleSubcategorySelect(subcategory)}
                      />
                    }
                    label={subcategory}
                  />
                ))
              }
            </div>
          ))}
        </FormGroup>
      </Collapse>
      <Button 
        onClick={startRandomGame}
        variant="contained"
        color="secondary"
        fullWidth
        style={{ marginTop: '1rem' }}
      >
        <Shuffle size={24} style={{ marginRight: '0.5rem' }} /> 
        랜덤 구절로 게임 시작
      </Button>
    </div>
  ), [state.categories, state.subcategories, state.selectedCategories, state.selectedSubcategories, state.showRangeSettings, handleCategorySelect, handleSubcategorySelect, startRandomGame, toggleRangeSettings, getSelectedRangeText]);
  const renderCategories = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <Button 
        onClick={startRandomGame}
        variant="contained"
        color="secondary"
        style={{ width: '400px', height: '80px', fontSize: '1.2rem', marginBottom: '2rem' }}
      >
        <Shuffle size={24} style={{ marginRight: '0.5rem' }} /> 랜덤 구절로 게임 시작
      </Button>
      {state.categories.map(category => (
        <Button 
          key={category} 
          onClick={() => handleCategoryClick(category)} 
          variant="outlined"
          style={{ width: '400px', height: '80px', fontSize: '1.2rem' }}
        >
          {category}
        </Button>
      ))}
    </div>
  ), [state.categories, handleCategoryClick, startRandomGame]);

  const renderSubcategories = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      {state.subcategories.map(subcategory => (
        <Button 
          key={subcategory} 
          onClick={() => handleSubcategoryClick(subcategory)} 
          variant="outlined"
          style={{ width: '400px', height: '60px', fontSize: '1rem' }}
        >
          {subcategory}
        </Button>
      ))}
    </div>
  ), [state.subcategories, handleSubcategoryClick]);

  const renderVerseList = useCallback(() => {
    let versesToRender;
    let listTitle = '';
    switch (state.viewMode) {
      case 'favorites':
        versesToRender = versesData.filter(verse => state.favorites.includes(getVerseId(verse)));
        listTitle = '즐겨찾기 목록';
        break;
      case 'completed':
        versesToRender = versesData.filter(verse => state.completedVerses.includes(getVerseId(verse)));
        listTitle = '암송완료 목록';
        break;
      default:
        versesToRender = state.verses.length > 0 ? state.verses : versesData;
        listTitle = state.currentSubcategory || '모든 구절';
    }

    const getVerseNumberInSubcategory = (verse) => {
      const subcategoryVerses = versesData.filter(v => v.subcategory === verse.subcategory);
      const totalVerses = subcategoryVerses.length;
      const currentIndex = subcategoryVerses.findIndex(v => v.number === verse.number) + 1;
      return `${currentIndex}/${totalVerses}`;
    };

    return (
      <>
        <Typography variant="h5" style={{ textAlign: 'center', marginBottom: '1rem' }}>{listTitle}</Typography>
        {versesToRender.length === 0 ? (
          <Typography variant="body1" style={{ textAlign: 'center', marginTop: '2rem' }}>
            {state.viewMode === 'favorites' ? '즐겨찾기 구절이 없습니다' : '암송완료 구절이 없습니다'}
          </Typography>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {versesToRender.map(verse => (
              <Card key={getVerseId(verse)}>
                <CardContent>
                  <Typography variant="body2" color="textSecondary">
                    {verse.category} &gt; {verse.subcategory}
                  </Typography>
                  <Typography variant="h6">
                    {`${verse.book} ${verse.chapter}:${verse.verse1}${verse.verse2 ? `-${verse.verse2}` : ''}`}
                    <span style={{ fontSize: '0.8em', marginLeft: '0.5rem' }}>
                      ({getVerseNumberInSubcategory(verse)})
                    </span>
                  </Typography>
                  <Typography variant="body2" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    {state.isKorean ? verse.koreanText : verse.englishText}
                  </Typography>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <Button 
                      onClick={() => handleComplete(verse)}
                      variant={state.completedVerses.includes(getVerseId(verse)) ? "contained" : "outlined"}
                      size="small"
                    >
                      <Check size={16} /> {state.completedVerses.includes(getVerseId(verse)) ? "암송완료" : "암송체크"}
                    </Button>
                    <Button 
                      onClick={() => handleFavorite(verse)}
                      variant={state.favorites.includes(getVerseId(verse)) ? "contained" : "outlined"}
                      size="small"
                    >
                      <Star size={16} /> {state.favorites.includes(getVerseId(verse)) ? "즐겨찾기 해제" : "즐겨찾기"}
                    </Button>
                    <Button 
                      onClick={() => startGame(verse)}
                      variant="outlined"
                      size="small"
                    >
                      <Gamepad size={16} /> 게임시작
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </>
    );
  }, [state.viewMode, state.verses, state.favorites, state.completedVerses, state.isKorean, state.currentSubcategory, handleComplete, handleFavorite, startGame]);

  const renderGame = useMemo(() => {
    if (!state.gameMode || !state.currentVerse) return null;
    return (
      <Card style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <CardContent>
          {renderGameControls}
          <Typography variant="body2" color="textSecondary">
            {state.currentVerse.category} &gt; {state.currentVerse.subcategory}
          </Typography>
          <Typography variant="h6">{`${state.currentVerse.book} ${state.currentVerse.chapter}:${state.currentVerse.verse1}${state.currentVerse.verse2 ? `-${state.currentVerse.verse2}` : ''}`}</Typography>
          
          {state.isCompleted && (
            <Typography variant="h4" style={{ color: 'green', textAlign: 'center', margin: '1rem 0' }}>
              할렐루야!!
            </Typography>
          )}
          
          <Button 
            onClick={handlePeek} 
            variant="outlined" 
            fullWidth 
            style={{ marginTop: '1rem', height: showVerse ? 'auto' : '40px', overflow: 'hidden' }}
          >
            {showVerse ? (
              <Typography>{state.isKorean ? state.currentVerse.koreanText : state.currentVerse.englishText}</Typography>
            ) : (
              <>
                <Eye size={16} style={{ marginRight: '0.5rem' }} /> 살짝보기({state.peekCount}번째)
              </>
            )}
          </Button>
          
          {state.accuracy !== null && (
            <Typography variant="body1" style={{ marginTop: '1rem', marginBottom: '1rem', textAlign: 'center' }}>정확도: {state.accuracy}%</Typography>
          )}
          
          <TextField
            value={state.userInput}
            onChange={handleInputChange}
            placeholder={state.isKorean ? "성경 구절을 입력하세요..." : "Enter the Bible verse..."}
            fullWidth
            margin="normal"
            multiline
            rows={4}
          />
          
          <Button onClick={handleCheck} variant="contained" color="primary" fullWidth style={{ marginTop: '0.5rem' }}>
            <Check size={16} style={{ marginRight: '0.5rem' }} /> 체크하기({state.checkCount}번째)
          </Button>
          
          {state.isCompleted && (
            <Button 
              onClick={() => handleComplete(state.currentVerse)}
              variant={state.completedVerses.includes(getVerseId(state.currentVerse)) ? "contained" : "outlined"}
              color="primary"
              fullWidth
              style={{ marginTop: '1rem' }}
            >
              {state.completedVerses.includes(getVerseId(state.currentVerse)) ? "암송완료 해제" : "암송완료"}
            </Button>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <Button onClick={exitGame} variant="contained" color="secondary">
              게임 중단
            </Button>
            <Button onClick={handleRandomVerse} variant="contained" color="primary">
              <Shuffle size={16} style={{ marginRight: '0.5rem' }} /> 다른 구절 하기
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }, [state.gameMode, state.currentVerse, state.isKorean, state.peekCount, state.accuracy, state.userInput, state.checkCount, state.isCompleted, state.completedVerses, handlePeek, handleInputChange, handleCheck, handleComplete, exitGame, handleRandomVerse, showVerse, renderGameControls]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '1rem' }}>
      <div style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1000, padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={state.gameMode ? exitGame : goBack} disabled={state.navigationLevel === 'categories'}>
          <ChevronLeft size={16} /> 이전단계로 돌아가기
        </Button>
        <Button onClick={goHome}>
          <Home size={16} /> 홈화면으로 돌아가기
        </Button>
      </div>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>성경 구절 암송 앱</h1>
      
      {state.gameMode ? renderGame : (
        <>
          {state.navigationLevel === 'categories' && renderCategories}
          {state.navigationLevel === 'subcategories' && renderSubcategories}
          {state.navigationLevel === 'verses' && renderVerseList()}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
        <Button 
          onClick={() => {
            setViewMode('favorites');
            if (state.gameMode) {
              dispatch({ type: 'EXIT_GAME' });
            }
          }}
          aria-label="View favorites"
          variant={state.viewMode === 'favorites' ? 'contained' : 'outlined'}
        >
          <Star size={16} style={{ marginRight: '0.5rem' }} /> 
          즐겨찾기 리스트({(state.favorites && state.favorites.length) || 0})
        </Button>
        <Button 
          onClick={() => {
            setViewMode('completed');
            if (state.gameMode) {
              dispatch({ type: 'EXIT_GAME' });
            }
          }}
          aria-label="View completed"
          variant={state.viewMode === 'completed' ? 'contained' : 'outlined'}
        >
          <Check size={16} style={{ marginRight: '0.5rem' }} /> 
          암송완료 리스트({(state.completedVerses && state.completedVerses.length) || 0})
        </Button>
        <Button onClick={toggleLanguage} aria-label="Toggle language">
          <Globe size={16} style={{ marginRight: '0.5rem' }} /> {state.isKorean ? "English" : "한국어"}
        </Button>
      </div>
    </div>
  );
};

export default BibleVerseApp;