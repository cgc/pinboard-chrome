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
        tagsLoading: false,
        savedURLs: {},
        savedAll: false,
        tags: null,
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

  UPDATE_POSTS_CACHE(state, action) {
    const { url, saved } = action.payload;
    if (!saved) {
      return state;
    }
    const rv = {
      ...state,
      savedURLs: {
        ...state.savedURLs,
        [url]: saved,
      },
    };
    if (url == state.activeTab?.url) {
      rv.tags = saved.tags;
    }
    return rv;
  },

  UPDATE_TAGS(state, action) {
    return {
      ...state,
      tags: action.payload,
    };
  },

  SUGGESTED_TAGS(state, action) {
    const rv = {
      ...state,
      suggestedTags: action.payload,
    };
    // This fills them in for an unsaved post.
    if (state.tags == null) {
      rv.tags = action.payload.scrubbed.join(' ');
    }
    return rv;
  },

  LOAD_TAB_STATE(state, action) {
    const tabs = action.payload;
    return {
      ...state,
      tabs,
      activeTab: tabs.find(tab => tab.active),
    };
  },

  SAVED_ALL(state) {
    return {
      ...state,
      savedAll: true,
    };
  },
});
