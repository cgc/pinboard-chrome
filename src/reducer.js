function makeReducer(kv) {
  function reducer(state, action) {
    const fn = kv[action.type];
    if (fn) {
      return fn(state, action);
    } else {
      throw new Error();
    }
  }
  function makeAction(type) {
    return function(payload) {
      return {type, payload};
    };
  }
  for (const key of Object.keys(kv)) {
    reducer[key] = makeAction(key);
  }
  return reducer;
}

export function init() {
    return {
        loginLoading: false,
        urlLoading: false,
        savedURLs: {},
        savedAll: false,
    };
}

export const reducer = makeReducer({
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

  SAVED_ALL(state) {
    return {
      ...state,
      savedAll: true,
    };
  },
});
