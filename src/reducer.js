import { createAction, handleAction, handleActions } from 'redux-actions';
import reduceReducers from 'reduce-reducers';
import invariant from 'invariant';

const reducer = handleActions({
  LOGIN(state, action) {
    return {
      ...state,
      token: action.payload,
    };
  },
  LOGOUT(state) {
    return {
      ...state,
      token: null,
    };
  },

  LOADING(state, action) {
    return {
      ...state,
      [action.payload]: true,
    };
  },
  NOT_LOADING(state, action) {
    return {
      ...state,
      [action.payload]: false,
    };
  },

  URL_LOADED(state, action) {
    return {
      ...state,
      url: action.payload,
    };
  },
}, {
  loginLoading: false,
  urlLoading: false,
});

export default reducer;
