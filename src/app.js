import React from 'react';
import ReactDOM from 'react-dom';
import ReduxThunk from 'redux-thunk';
import reducer from './reducer';
import { applyMiddleware, createStore } from 'redux';
import { Provider } from 'react-redux';
import { PopupContainer } from './popup';
import { login, loadTabState } from './actions';

const store = createStore(reducer, applyMiddleware(ReduxThunk));

const mountNode = document.querySelector('#root');
ReactDOM.render(<Provider store={ store }><PopupContainer /></Provider>, mountNode);

const storedToken = localStorage.getItem('token');
if (storedToken) {
  store.dispatch(login(storedToken));
}

store.dispatch(loadTabState());
