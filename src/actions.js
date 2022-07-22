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

export async function pinboardSave(token, { url, title }) {
  const suggest = await pinboard('/posts/suggest', {
    auth_token: token,
    url: url,
  });
  const msg = 'testing to see if suggest response adheres to expectations';
  invariant(suggest.length == 2, msg);
  invariant('popular' in suggest[0], msg);
  invariant('recommended' in suggest[1], msg);
  const recommended = scrubTags(suggest[1].recommended);
  return await pinboard('/posts/add', {
    auth_token: token,
    url,
    description: title,
    tags: recommended.join(','),
    replace: 'no',
  });
}

async function tokenValid(token) {
  const response = await pinboard('/user/auth_token', {
    auth_token: token, format: 'xml',
  });
  return response.status === 200;
}

async function hasPosts(token, url) {
  const body = await pinboard('/posts/get', {
    auth_token: token,
    url: url,
  });
  return Boolean(body.posts.length);
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
  return (dispatch) => {
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      dispatch(reducer.LOAD_TAB_STATE(tabs.map(tab => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        active: tab.active,
      }))));
    });
  };
}

export function fetchURLSavedStatus(url) {
  return async (dispatch, getState) => {
    const { token, savedURLs } = getState();
    if (url in savedURLs) {
      return savedURLs[url];
    }
    const urlHasPosts = await loading(dispatch, 'urlLoading', hasPosts(token, url));
    dispatch(reducer.HAS_POSTS({
      url: url,
      saved: urlHasPosts,
    }));
    return urlHasPosts;
  };
}

export function fetchActiveTabStatus() {
  return (dispatch, getState) => {
    const { tabs } = getState();
    const tab = tabs.find(tab => tab.active);
    dispatch(fetchURLSavedStatus(tab.url));
  };
}

export function saveActiveTab() {
  return async (dispatch, getState) => {
    const { token, tabs } = getState();
    const tab = tabs.find(tab => tab.active);
    await loading(dispatch, 'urlLoading', pinboardSave(token, tab));
    dispatch(reducer.HAS_POSTS({
      url: tab.url,
      saved: true,
    }));
  };
}

export function saveAll() {
  return async (dispatch, getState) => {
    const { token, tabs } = getState();
    const saves = tabs.map(async tab => {
      const hasPosts = await dispatch(fetchURLSavedStatus(tab.url));
      if (hasPosts) {
        return;
      }
      return await pinboardSave(token, tab);
    });
    await loading(dispatch, 'urlLoading', Promise.all(saves));
    dispatch(reducer.SAVED_ALL());
  };
}
