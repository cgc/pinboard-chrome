import { stringify } from 'querystring';
import invariant from 'invariant';
import throat from 'throat';
import { reducer } from './reducer';

const chrome = window.chrome;

const pinboardLimiter = throat(2);

const tagBlacklist = [
  'ifttt',
  'twitter',
  'facebook',
  'WSH',
  'twitterlink',
  '@autoreleasepool',
  '@codepo8',
  'Aiviq',
  'buffer',
  'IFTTT',
  'Pocket',
  'Unread',
  'Instapaper',
  'Feedly',
];

function scrubTags(tagArray) {
  const tags = new Set(tagArray);
  // didn't want to blanket remove 1960s
  if (tags.has('@codepo8')) {
    tags.delete('1960s');
    tags.delete('objective-c');
  }

  for (const blacklisted of tagBlacklist) {
    tags.delete(blacklisted);
  }

  return Array.from(tags);
}

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthError";
  }
}

async function pinboard(path, queryArg={}) {
  const query = {
    format: 'json',
    ...queryArg,
  };
  const response = await pinboardLimiter(() =>
    fetch(`https://api.pinboard.in/v1${ path }?${ stringify(query) }`)
  );
  if (response.status == 401) {
    throw new AuthError(`pinboard request to ${ path } failed with ${ response.status }`);
  }
  if (query.format != 'json') {
    return response;
  }
  const body = await response.json();
  const code = body.result_code;
  if (code && code !== 'done') {
    throw new Error(`pinboard request to ${ path } failed with ${ code }`);
  }
  return body;
}

export async function pinboardPostsSuggest(token, url, {dispatch}={}) {
  const suggest = await pinboard('/posts/suggest', {
    auth_token: token,
    url: url,
  });
  const msg = 'testing to see if suggest response adheres to expectations';
  invariant(suggest.length == 2, msg);
  invariant('popular' in suggest[0], msg);
  invariant('recommended' in suggest[1], msg);
  const scrubbed = scrubTags(suggest[1].recommended);
  const rv = {
    response: {
      popular: suggest[0].popular,
      recommended: suggest[1].recommended,
    },
    scrubbed,
  };
  if (dispatch) {
    // NOTE we only do this for the active tab
    dispatch(reducer.SUGGESTED_TAGS(rv));
  }
  return rv;
}

export function pinboardPostsSuggestForDispatch(url) {
  return async function(dispatch, getState) {
    const {token} = getState();
    await pinboardPostsSuggest(token, url, {dispatch});
  };
}

export async function pinboardPostsAdd(token, { url, title, tags }) {
  await pinboard('/posts/add', {
    auth_token: token,
    url,
    description: title,
    tags: tags,
  });
  return { url, tags, time: new Date().toISOString() };
}

async function tokenValid(token) {
  const response = await pinboard('/user/auth_token', {
    auth_token: token, format: 'xml',
  });
  return response.status === 200;
}

async function pinboardPostsGet(token, url) {
  const body = await pinboard('/posts/get', {
    auth_token: token,
    url: url,
  });
  // Picking an arbitrary post to make things simpler...
  return body.posts && body.posts[0];
}

async function loading(dispatch, stateKey, promise) {
  dispatch(reducer.LOADING(stateKey));
  try {
    return await promise;
  } catch(e) {
    if (e instanceof AuthError) {
      dispatch(reducer.LOGOUT());
    } else {
      throw e;
    }
  } finally {
    dispatch(reducer.NOT_LOADING(stateKey));
  }
}

export function login(token) {
  return async (dispatch) => {
    const isValid = await loading(dispatch, 'loginLoading', tokenValid(token));
    if (isValid) {
      dispatch(reducer.LOGIN(token));
      localStorage.setItem('token', token);
    }
  };
}

export function loadTabState() {
  return async (dispatch) => {
    const tabs = await new Promise(resolve => chrome.tabs.query({currentWindow: true}, resolve));
    dispatch(reducer.LOAD_TAB_STATE(tabs.map(
      ({id, url, title, active}) => ({id, url, title, active}))));
  };
}

export function fetchURLSavedStatus(url) {
  return async (dispatch, getState) => {
    const { token, savedURLs } = getState();
    if (url in savedURLs) {
      return savedURLs[url];
    }
    const post = await loading(dispatch, 'urlLoading', pinboardPostsGet(token, url));
    dispatch(reducer.UPDATE_POSTS_CACHE({
      url: url,
      saved: post,
    }));
    return post;
  };
}

export function fetchActiveTabStatus() {
  return (dispatch, getState) => {
    const { tabs } = getState();
    const tab = tabs.find(tab => tab.active);
    dispatch(fetchURLSavedStatus(tab.url));
  };
}

export function saveTab({ url, title }, tags) {
  return async (dispatch, getState) => {
    const { token, activeTab } = getState();

    if (!tags) {
      invariant(url != activeTab.url, 'active tab should use tags on page');
      // We don't pass dispatch() in since that would overwrite state.tags
      const suggest = await pinboardPostsSuggest(token, url);
      tags = suggest.scrubbed.join(' ');
    }
    const response = await loading(dispatch, 'urlLoading', pinboardPostsAdd(token, { url, title, tags }));
    dispatch(reducer.UPDATE_POSTS_CACHE({
      url: url,
      saved: response,
    }));
  };
}

export function saveActiveTab() {
  return async (dispatch, getState) => {
    const { activeTab, tags } = getState();
    await dispatch(saveTab(activeTab, tags));
  };
}

export function saveAll() {
  return async (dispatch, getState) => {
    const { tabs, activeTab } = getState();
    const saves = tabs.map(async tab => {
      const post = await dispatch(fetchURLSavedStatus(tab.url));

      if (activeTab.url == tab.url) {
        const { tags } = getState();
        if (post?.tags == tags) {
          return;
        }
        await dispatch(saveActiveTab());
        return;
      }

      if (post) {
        return;
      }
      await dispatch(saveTab(tab));
    });
    await loading(dispatch, 'urlLoading', Promise.all(saves));
    dispatch(reducer.SAVED_ALL());
  };
}
