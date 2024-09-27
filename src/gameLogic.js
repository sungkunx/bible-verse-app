import React from 'react';
import { Button, Typography, FormGroup, FormControlLabel, Switch, Collapse, Card, CardContent } from '@mui/material';
import { Star, Check, Gamepad, Shuffle, Settings } from 'lucide-react';
import { getVerseId, getRandomVerse } from './utils';
import versesData from './verses.json';

export const renderCategories = (state, dispatch) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
    <Button 
      onClick={() => {
        const randomVerse = getRandomVerse(state.selectedCategories, state.selectedSubcategories, state.selectedSubsubcategories);
        dispatch({ type: 'START_GAME', payload: randomVerse });
      }}
      variant="contained"
      color="secondary"
      style={{ width: '400px', height: '80px', fontSize: '1.2rem', marginBottom: '2rem' }}
    >
      <Shuffle size={24} style={{ marginRight: '0.5rem' }} /> 랜덤 구절로 게임 시작
    </Button>
    {state.categories.map(category => (
      <Button 
        key={category} 
        onClick={() => {
          const subcategories = [...new Set(versesData.filter(verse => verse.category === category).map(verse => verse.subcategory))];
          dispatch({ type: 'SET_SUBCATEGORIES', payload: subcategories });
          dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'subcategories' });
        }} 
        variant="outlined"
        style={{ width: '400px', height: '80px', fontSize: '1.2rem' }}
      >
        {category}
      </Button>
    ))}
  </div>
);

export const renderSubcategories = (state, dispatch) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
    {state.subcategories.map(subcategory => (
      <Button 
        key={subcategory} 
        onClick={() => {
          const subsubcategories = [...new Set(versesData.filter(verse => verse.subcategory === subcategory).map(verse => verse.subsubcategory))];
          dispatch({ type: 'SET_SUBSUBCATEGORIES', payload: subsubcategories });
          dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'subsubcategories' });
        }} 
        variant="outlined"
        style={{ width: '400px', height: '60px', fontSize: '1rem' }}
      >{subcategory}
      </Button>
    ))}
  </div>
);

export const renderSubsubcategories = (state, dispatch) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
    {state.subsubcategories.map(subsubcategory => (
      <Button 
        key={subsubcategory} 
        onClick={() => {
          const verses = versesData.filter(verse => verse.subsubcategory === subsubcategory).sort((a, b) => a.number - b.number);
          dispatch({ type: 'SET_VERSES', payload: verses, subsubcategory });
          dispatch({ type: 'SET_NAVIGATION_LEVEL', payload: 'verses' });
        }} 
        variant="outlined"
        style={{ width: '400px', height: '60px', fontSize: '1rem' }}
      >
        {subsubcategory}
      </Button>
    ))}
  </div>
);

export const renderVerseList = (state, dispatch) => {
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
      listTitle = state.currentSubsubcategory || state.currentSubcategory || state.currentCategory || '모든 구절';
  }

  const getVerseNumberInSubcategory = (verse) => {
    const subcategoryVerses = versesData.filter(v => v.subsubcategory === verse.subsubcategory);
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
                  {verse.category} &gt; {verse.subcategory} &gt; {verse.subsubcategory}
                </Typography>
                <Typography variant="h6">{verse.versename}</Typography>
                <Typography variant="subtitle1">
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
                    onClick={() => dispatch({ type: 'TOGGLE_COMPLETED', payload: getVerseId(verse) })}
                    variant={state.completedVerses.includes(getVerseId(verse)) ? "contained" : "outlined"}
                    size="small"
                  >
                    <Check size={16} /> {state.completedVerses.includes(getVerseId(verse)) ? "암송완료" : "암송체크"}
                  </Button>
                  <Button 
                    onClick={() => dispatch({ type: 'TOGGLE_FAVORITE', payload: getVerseId(verse) })}
                    variant={state.favorites.includes(getVerseId(verse)) ? "contained" : "outlined"}
                    size="small"
                  >
                    <Star size={16} /> {state.favorites.includes(getVerseId(verse)) ? "즐겨찾기 해제" : "즐겨찾기"}
                  </Button>
                  <Button 
                    onClick={() => dispatch({ type: 'START_GAME', payload: verse })}
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
};

export const renderGameControls = (state, dispatch) => (
  <div style={{ marginBottom: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <Typography variant="subtitle1">선택된 범위: {getSelectedRangeText(state)}</Typography>
      <Button 
        onClick={() => dispatch({ type: 'TOGGLE_RANGE_SETTINGS' })}
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
                onChange={() => handleCategorySelect(category, state, dispatch)}
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
                      onChange={() => handleSubcategorySelect(subcategory, state, dispatch)}
                    />
                  }
                  label={subcategory}
                />
              ))
            }
          </div>
        ))}
        <Typography variant="subtitle1" style={{ marginTop: '1rem' }}>세부 카테고리</Typography>
        {state.subcategories.map(subcategory => (
          <div key={subcategory}>
            <Typography variant="subtitle2">{subcategory}</Typography>
            {state.subsubcategories
              .filter(subsubcategory => versesData.some(verse => verse.subcategory === subcategory && verse.subsubcategory === subsubcategory))
              .map(subsubcategory => (
                <FormControlLabel
                  key={subsubcategory}
                  control={
                    <Switch
                      checked={state.selectedSubsubcategories.includes(subsubcategory)}
                      onChange={() => handleSubsubcategorySelect(subsubcategory, state, dispatch)}
                    />
                  }
                  label={subsubcategory}
                />
              ))
            }
          </div>
        ))}
      </FormGroup>
    </Collapse>
    <Button 
      onClick={() => {
        const randomVerse = getRandomVerse(state.selectedCategories, state.selectedSubcategories, state.selectedSubsubcategories);
        dispatch({ type: 'START_GAME', payload: randomVerse });
      }}
      variant="contained"
      color="secondary"
      fullWidth
      style={{ marginTop: '1rem' }}
    >
      <Shuffle size={24} style={{ marginRight: '0.5rem' }} /> 
      랜덤 구절로 게임 시작
    </Button>
  </div>
);

const getSelectedRangeText = (state) => {
  const selectedCategories = state.selectedCategories.length;
  const selectedSubcategories = state.selectedSubcategories.length;
  const selectedSubsubcategories = state.selectedSubsubcategories.length;
  
  if (selectedCategories === 0 && selectedSubcategories === 0 && selectedSubsubcategories === 0) {
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
  if (selectedSubsubcategories > 0) {
    if (text) text += ', ';
    text += `${selectedSubsubcategories}개 세부 카테고리`;
  }
  return text + ' 선택됨';
};

const handleCategorySelect = (category, state, dispatch) => {
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

  const categorySubsubcategories = versesData
    .filter(verse => verse.category === category)
    .map(verse => verse.subsubcategory);

  let updatedSubsubcategories;
  if (updatedCategories.includes(category)) {
    updatedSubsubcategories = [...new Set([...state.selectedSubsubcategories, ...categorySubsubcategories])];
  } else {
    updatedSubsubcategories = state.selectedSubsubcategories.filter(subsubcat => !categorySubsubcategories.includes(subsubcat));
  }

  dispatch({ type: 'SET_SELECTED_SUBSUBCATEGORIES', payload: updatedSubsubcategories });
};

const handleSubcategorySelect = (subcategory, state, dispatch) => {
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

  const subcategorySubsubcategories = versesData
    .filter(verse => verse.subcategory === subcategory)
    .map(verse => verse.subsubcategory);

  let updatedSubsubcategories;
  if (updatedSubcategories.includes(subcategory)) {
    updatedSubsubcategories = [...new Set([...state.selectedSubsubcategories, ...subcategorySubsubcategories])];
  } else {
    updatedSubsubcategories = state.selectedSubsubcategories.filter(subsubcat => !subcategorySubsubcategories.includes(subsubcat));
  }

  dispatch({ type: 'SET_SELECTED_SUBSUBCATEGORIES', payload: updatedSubsubcategories });
};

const handleSubsubcategorySelect = (subsubcategory, state, dispatch) => {
  const updatedSubsubcategories = state.selectedSubsubcategories.includes(subsubcategory)
    ? state.selectedSubsubcategories.filter(subsubcat => subsubcat !== subsubcategory)
    : [...state.selectedSubsubcategories, subsubcategory];
  
  dispatch({ type: 'SET_SELECTED_SUBSUBCATEGORIES', payload: updatedSubsubcategories });

  const subsubcategorySubcategory = versesData.find(verse => verse.subsubcategory === subsubcategory)?.subcategory;
  const subcategorySubsubcategories = versesData
    .filter(verse => verse.subcategory === subsubcategorySubcategory)
    .map(verse => verse.subsubcategory);
  
  const allSubcategorySubsubcategoriesSelected = subcategorySubsubcategories.every(subsubcat => updatedSubsubcategories.includes(subsubcat));
  
  let updatedSubcategories;
  if (allSubcategorySubsubcategoriesSelected) {
    updatedSubcategories = [...new Set([...state.selectedSubcategories, subsubcategorySubcategory])];
  } else {
    updatedSubcategories = state.selectedSubcategories.filter(subcat => subcat !== subsubcategorySubcategory);
  }
  
  dispatch({ type: 'SET_SELECTED_SUBCATEGORIES', payload: updatedSubcategories });

  const subsubcategoryCategory = versesData.find(verse => verse.subsubcategory === subsubcategory)?.category;
  const categorySubsubcategories = versesData
    .filter(verse => verse.category === subsubcategoryCategory)
    .map(verse => verse.subsubcategory);
  
  const allCategorySubsubcategoriesSelected = categorySubsubcategories.every(subsubcat => updatedSubsubcategories.includes(subsubcat));
  
  let updatedCategories;
  if (allCategorySubsubcategoriesSelected) {
    updatedCategories = [...new Set([...state.selectedCategories, subsubcategoryCategory])];
  } else {
    updatedCategories = state.selectedCategories.filter(cat => cat !== subsubcategoryCategory);
  }
  
  dispatch({ type: 'SET_SELECTED_CATEGORIES', payload: updatedCategories });
};