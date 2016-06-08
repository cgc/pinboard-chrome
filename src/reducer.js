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

  HAS_POSTS(state, action) {
    const { url, saved } = action.payload;
    return {
      ...state,
      savedURLs: {
        ...state.savedURLs,
        [url]: saved,
      },
    };
  },

  LOAD_TAB_STATE(state, action) {
    return {
      ...state,
      tabs: action.payload,
    };
  },
}, {
  loginLoading: false,
  urlLoading: false,
  savedURLs: {},
});

export default reducer;
