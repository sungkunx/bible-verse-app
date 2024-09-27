import React, { useReducer, useEffect } from 'react';
import { Button, Typography } from '@mui/material';
import { Star, Check, Globe, ChevronLeft, Home, Shuffle } from 'lucide-react';
import { reducer, initialState } from './stateManagement';
import GameComponent from './GameComponent';
import { renderCategories, renderSubcategories, renderSubsubcategories, renderVerseList } from './gameLogic';

import versesData from './verses.json';

const BibleVerseApp = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const categories = [...new Set(versesData.map(verse => verse.category))];
    const subcategories = [...new Set(versesData.map(verse => verse.subcategory))];
    const subsubcategories = [...new Set(versesData.map(verse => verse.subsubcategory))];
    dispatch({ type: 'SET_CATEGORIES', payload: categories });
    dispatch({ type: 'SET_SUBCATEGORIES', payload: subcategories });
    dispatch({ type: 'SET_SUBSUBCATEGORIES', payload: subsubcategories });

    try {
      const storedCompleted = JSON.parse(localStorage.getItem('completedVerses')) || [];
      const storedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
      dispatch({ type: 'LOAD_SAVED_DATA', payload: { completedVerses: storedCompleted, favorites: storedFavorites } });
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }, []);

  const goBack = () => {
    if (state.navigationLevel === 'subsubcategories') {
      dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'subcategories' });
    } else if (state.navigationLevel === 'subcategories') {
      dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'categories' });
    } else if (state.navigationLevel === 'verses') {
      dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'subsubcategories' });
    }
    dispatch({ type: 'SET_VIEW_MODE', payload: 'normal' });
  };

  const goHome = () => {
    dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'categories' });
    dispatch({ type: 'SET_VIEW_MODE', payload: 'normal' });
    if (state.gameMode) {
      dispatch({ type: 'EXIT_GAME' });
    }
  };

  const setViewMode = (mode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
    if (mode === 'favorites' || mode === 'completed') {
      dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'verses' });
    }
  };

  const toggleLanguage = () => {
    dispatch({ type: 'TOGGLE_LANGUAGE' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '1rem' }}>
      <div style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1000, padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={state.gameMode ? () => dispatch({ type: 'EXIT_GAME' }) : goBack} disabled={state.navigationLevel === 'categories'}>
          <ChevronLeft size={16} /> 이전단계로 돌아가기
        </Button>
        <Button onClick={goHome}>
          <Home size={16} /> 홈화면으로 돌아가기
        </Button>
      </div>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>성경 구절 암송 앱</h1>
      
      {state.gameMode ? (
        <GameComponent state={state} dispatch={dispatch} />
      ) : (
        <>
          {state.navigationLevel === 'categories' && renderCategories(state, dispatch)}
          {state.navigationLevel === 'subcategories' && renderSubcategories(state, dispatch)}
          {state.navigationLevel === 'subsubcategories' && renderSubsubcategories(state, dispatch)}
          {state.navigationLevel === 'verses' && renderVerseList(state, dispatch)}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
        <Button 
          onClick={() => setViewMode('favorites')}
          aria-label="View favorites"
          variant={state.viewMode === 'favorites' ? 'contained' : 'outlined'}
        >
          <Star size={16} style={{ marginRight: '0.5rem' }} /> 
          즐겨찾기 리스트({(state.favorites && state.favorites.length) || 0})
        </Button>
        <Button 
          onClick={() => setViewMode('completed')}
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