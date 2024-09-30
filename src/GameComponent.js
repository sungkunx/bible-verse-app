import React, { useState, useCallback, useMemo } from 'react';
import { Button, Card, CardContent, Typography, TextField } from '@mui/material';
import { Check, Eye, Shuffle } from 'lucide-react';
import { getVerseId, calculateAccuracy, getRandomVerse } from './utils';
import { renderGameControls } from './gameLogic';

const GameComponent = ({ state, dispatch }) => {
  const [showVerse, setShowVerse] = useState(false);

  const handlePeek = useCallback(() => {
    setShowVerse(true);
    setTimeout(() => setShowVerse(false), 1500);
    dispatch({ type: 'SET_PEEK_COUNT', payload: state.peekCount + 1 });
  }, [state.peekCount, dispatch]);

  const handleCheck = useCallback(() => {
    const accuracy = calculateAccuracy(state.currentVerse, state.userInput, state.isKorean);
    dispatch({ type: 'SET_ACCURACY', payload: accuracy });
    dispatch({ type: 'SET_CHECK_COUNT', payload: state.checkCount + 1 });
    if (accuracy === 100) {
      dispatch({ type: 'SET_COMPLETED', payload: true });
    }
  }, [state.currentVerse, state.userInput, state.isKorean, state.checkCount, dispatch]);

  const handleRandomVerse = useCallback(() => {
    const randomVerse = getRandomVerse(state.selectedCategories, state.selectedSubcategories, state.selectedSubsubcategories);
    dispatch({ type: 'START_GAME', payload: randomVerse });
  }, [state.selectedCategories, state.selectedSubcategories, state.selectedSubsubcategories, dispatch]);

  const handleInputChange = useCallback((e) => {
    dispatch({ type: 'SET_USER_INPUT', payload: e.target.value });
  }, [dispatch]);

  const handleComplete = useCallback(() => {
    dispatch({ type: 'TOGGLE_COMPLETED', payload: getVerseId(state.currentVerse) });
  }, [state.currentVerse, dispatch]);

  return useMemo(() => {
    if (!state.gameMode || !state.currentVerse) return null;
    return (
      <Card style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <CardContent>
          {renderGameControls(state, dispatch)}
          <Typography variant="body2" color="textSecondary">
            {state.currentVerse.category} &gt; {state.currentVerse.subcategory} &gt; {state.currentVerse.subsubcategory}
          </Typography>
          <Typography variant="h6">{state.currentVerse.versename}</Typography>
          
          <Typography variant="subtitle1">{`${state.currentVerse.book} ${state.currentVerse.chapter}:${state.currentVerse.verse1}${state.currentVerse.verse2 ? `-${state.currentVerse.verse2}` : ''}`}</Typography>
          
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
              onClick={handleComplete}
              variant={state.completedVerses.includes(getVerseId(state.currentVerse)) ? "contained" : "outlined"}
              color="primary"
              fullWidth
              style={{ marginTop: '1rem' }}
            >
              {state.completedVerses.includes(getVerseId(state.currentVerse)) ? "암송완료 해제" : "암송완료"}
            </Button>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <Button onClick={() => dispatch({ type: 'EXIT_GAME' })} variant="contained" color="secondary">
              게임 중단
            </Button>
            <Button onClick={handleRandomVerse} variant="contained" color="primary">
              <Shuffle size={16} style={{ marginRight: '0.5rem' }} /> 다른 구절 하기
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }, [state, dispatch, showVerse, handlePeek, handleCheck, handleInputChange, handleComplete, handleRandomVerse]);
};

export default GameComponent;