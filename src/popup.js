import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { init, reducer } from './reducer';
import { fetchActiveTabStatus, loadTabState, login, pinboardPostsSuggestForDispatch, saveActiveTab, saveAll } from './actions';
import { Store, StoreProvider, useDispatch, useStoreState } from './store';
import styled, { css } from 'styled-components';

function Login({
  loginLoading,
}) {
  const [token, setToken] = useState('');
  const dispatch = useDispatch();

  const loginLabel = loginLoading ? '...' : 'login';
  return (<div>
    <input placeholder='auth token' type="text" onChange={ (e) => setToken(e.target.value) } value={ token } />
    <button onClick={ (e) => dispatch(login(token)) } disabled={ loginLoading }>{ loginLabel }</button>
  </div>);
}

Login.propTypes = {
  loginLoading: PropTypes.bool.isRequired,
};

const TagLabel = styled.label`
padding: 2px;
margin: 2px;
border-radius: 3px;
line-height: 1.4rem;
cursor: pointer;

& input[type=checkbox] {
  margin-top: 0;
  vertical-align: middle;
  cursor: pointer;
}

&:hover {
  background: rgb(0, 0, 0, 0.1);
}

${props => props.hasTag && css`
  background: rgb(0, 0, 0, 0.2);
`}
`;

function Tag({ tag, hasTag, addTag, removeTag }) {
  return (
    <TagLabel hasTag={hasTag}>
      <input type="checkbox" checked={hasTag} onChange={((e) => e.target.checked ? addTag(tag) : removeTag(tag))} />
      {tag}
    </TagLabel>
  );
}

Tag.propTypes = {
  tag: PropTypes.string.isRequired,
  hasTag: PropTypes.bool.isRequired,
  addTag: PropTypes.func.isRequired,
  removeTag: PropTypes.func.isRequired,
};

function Tags({
  suggestedTags,
  tags,
}) {
  const dispatch = useDispatch();

  function hasTag(tag) {
    return new RegExp('\\b' + tag + '\\b').test(tags);
  }
  function addTag(tag) {
    if (!hasTag(tag)) {
      dispatch(reducer.UPDATE_TAGS([tags, tag].join(' ')));
    }
  }
  function removeTag(tag) {
    if (hasTag(tag)) {
      dispatch(reducer.UPDATE_TAGS(
        tags.replaceAll(new RegExp(' ?\\b' + tag + '\\b', 'g'), '').trim()
      ));
    }
  }
  const sugg = suggestedTags ? <>
    <p>
      <b>popular tags</b> {suggestedTags.response.popular.map(t => <Tag key={t} tag={t} hasTag={hasTag(t)} addTag={addTag} removeTag={removeTag} />)}
    </p>
    <p>
      <b>recommended tags</b> {suggestedTags.response.recommended.map(t => <Tag key={t} tag={t} hasTag={hasTag(t)} addTag={addTag} removeTag={removeTag} />)}
    </p>
  </> : 'Loading tags...';
  return <div>
    <textarea rows={4} cols={40} value={tags || ''} onChange={e => dispatch(reducer.UPDATE_TAGS(e.target.value))} />
    {sugg}
  </div>;
}

Tags.propTypes = {
  tags: PropTypes.string,
  suggestedTags: PropTypes.shape({
    response: PropTypes.shape({
      popular: PropTypes.arrayOf(PropTypes.string),
      recommended: PropTypes.arrayOf(PropTypes.string),
    }),
  }),
};

function Bookmark({
  savedAll,
  urlLoading,
  pinboardPost,
  tags,
}) {
  const dispatch = useDispatch();

  const needsUpdate = pinboardPost && tags != pinboardPost.tags;
  let saveDisabled, saveLabel;
  if (urlLoading) {
    saveDisabled = true;
    saveLabel = '...';
  } else if (pinboardPost && !needsUpdate) {
    saveDisabled = true;
    saveLabel = 'saved';
  } else {
    saveDisabled = false;
    saveLabel = needsUpdate ? 'update' : 'save';
  }

  const saveAllLabel = savedAll ? 'saved all' : 'save all';

  return (<div>
    <button onClick={ () => dispatch(saveActiveTab()) } disabled={ saveDisabled }>{ saveLabel }</button>
    <button onClick={ () => dispatch(saveAll()) } disabled={ savedAll }>{ saveAllLabel }</button>
  </div>);
}

Bookmark.propTypes = {
  urlLoading: PropTypes.bool.isRequired,
  savedAll: PropTypes.bool.isRequired,
  pinboardPost: PropTypes.object,
  tags: PropTypes.string,
};

export function Popup() {
  const state = useStoreState();
  const {token, tabs, savedAll, urlLoading, savedURLs, loginLoading, tagsLoading, activeTab, suggestedTags, tags} = state;

  if (!token) {
    return <Login loginLoading={loginLoading} />;
  }

  if (!tabs) {
    return <div></div>;
  }

  const pinboardPost = savedURLs[activeTab.url];
  return <>
    {pinboardPost && `Saved on ${new Date(pinboardPost.time).toLocaleDateString()}`}
    <Bookmark activeTab={activeTab} savedAll={savedAll} urlLoading={urlLoading} savedURLs={savedURLs} tags={tags} pinboardPost={pinboardPost} />
    <Tags tagsLoading={tagsLoading} pinboardPost={pinboardPost} suggestedTags={suggestedTags} activeTab={activeTab} tags={tags} />
  </>;
}

const store = new Store(reducer, init());

const Main = styled.div`
min-width: 350;
min-height: 150;
`;

export function App() {
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      store.dispatch(reducer.LOGIN(storedToken));
    }
    async function load(dispatch, getState) {
      await dispatch(loadTabState());
      await dispatch(fetchActiveTabStatus());
      await dispatch(pinboardPostsSuggestForDispatch(getState().activeTab.url));
    }
    store.dispatch(load);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // We explicitly only want these to run once.

  return (
    <StoreProvider store={store}>
      <Main><Popup /></Main>
    </StoreProvider>
  );
}
