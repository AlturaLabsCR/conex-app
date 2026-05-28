import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $createHeadingNode, HeadingNode, QuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  type EditorState,
  type LexicalEditor,
  UNDO_COMMAND,
} from 'lexical';
import React, { useCallback, useMemo, useRef, useState } from 'react';

export type RichTextEditorContentProps = {
  initialHtml: string;
  isDirty: boolean;
  isDark: boolean;
  isSaving: boolean;
  onHtmlChange?: (html: string) => void;
  onSync?: () => void | Promise<void>;
};

export function RichTextEditorContent({
  initialHtml,
  isDirty,
  isDark,
  isSaving,
  onHtmlChange,
  onSync,
}: RichTextEditorContentProps) {
  const [isToolbarHidden, setIsToolbarHidden] = useState(false);
  const lastScrollTopRef = useRef(0);

  const initialConfig = useMemo(
    () => ({
      namespace: 'ConexEditor',
      nodes: [HeadingNode, QuoteNode],
      theme: lexicalTheme,
      onError(error: Error) {
        throw error;
      },
      editorState: (editor: LexicalEditor) => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(initialHtml || '<p></p>', 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        const root = $getRoot();

        root.clear();
        root.select();
        $insertNodes(nodes);
      },
    }),
    [initialHtml]
  );

  const showToolbar = useCallback(() => {
    setIsToolbarHidden(false);
  }, []);

  const handleEditorScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    const lastScrollTop = lastScrollTopRef.current;
    const scrollDelta = scrollTop - lastScrollTop;

    if (Math.abs(scrollDelta) > 8) {
      setIsToolbarHidden(scrollDelta > 0 && scrollTop > 24);
    }

    lastScrollTopRef.current = scrollTop;
  }, []);

  return (
    <div className={isDark ? 'editor-shell dark' : 'editor-shell'}>
      <style>{styles}</style>
      <LexicalComposer initialConfig={initialConfig}>
        <Toolbar
          isDirty={isDirty}
          isHidden={isToolbarHidden}
          isSaving={isSaving}
          onSync={onSync}
        />
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="editor-input"
              onFocus={showToolbar}
              onPointerDown={showToolbar}
              onScroll={handleEditorScroll}
            />
          }
          placeholder={<div className="editor-placeholder">Start writing...</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <OnChangePlugin
          ignoreHistoryMergeTagChange
          ignoreSelectionChange
          onChange={(editorState, editor) => {
            onHtmlChange?.(serializeEditorState(editorState, editor));
          }}
        />
      </LexicalComposer>
    </div>
  );
}

function Toolbar({
  isDirty,
  isHidden,
  isSaving,
  onSync,
}: {
  isDirty: boolean;
  isHidden: boolean;
  isSaving: boolean;
  onSync?: () => void | Promise<void>;
}) {
  return (
    <div
      className={isHidden ? 'toolbar toolbar-hidden' : 'toolbar'}
      aria-label="Editor formatting">
      <div className="toolbar-tools-wrap">
        <div className="toolbar-tools">
          <ToolbarButton
            label="Undo"
            command={(editor) => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
            <UndoIcon />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            command={(editor) => editor.dispatchCommand(REDO_COMMAND, undefined)}>
            <RedoIcon />
          </ToolbarButton>
          <Divider />
          <ToolbarButton
            label="Bold"
            command={(editor) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}>
            B
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            command={(editor) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}>
            <span className="format-italic">I</span>
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            command={(editor) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}>
            <span className="format-underline">U</span>
          </ToolbarButton>
          <Divider />
          <ToolbarButton label="Heading 2" command={(editor) => formatHeading(editor, 'h2')}>
            <span className="heading-icon heading-icon-main">T</span>
          </ToolbarButton>
          <ToolbarButton label="Heading 3" command={(editor) => formatHeading(editor, 'h3')}>
            <span className="heading-icon heading-icon-sub">T</span>
          </ToolbarButton>
          <ToolbarButton label="Paragraph" command={(editor) => formatParagraph(editor)}>
            P
          </ToolbarButton>
          <Divider />
          <ToolbarButton
            label="Align left"
            command={(editor) => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}>
            <AlignLeftIcon />
          </ToolbarButton>
          <ToolbarButton
            label="Align center"
            command={(editor) => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}>
            <AlignCenterIcon />
          </ToolbarButton>
          <ToolbarButton
            label="Align right"
            command={(editor) => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}>
            <AlignRightIcon />
          </ToolbarButton>
        </div>
      </div>
      {isDirty ? (
        <>
          <Divider />
          <button
            aria-label="Sync changes"
            className="sync-button"
            disabled={isSaving}
            title="Sync changes"
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              if (!isSaving) {
                void onSync?.();
              }
            }}>
            <SyncIcon />
            Sync
          </button>
        </>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  children,
  command,
  label,
}: {
  children: React.ReactNode;
  command: (editor: LexicalEditor) => void;
  label: string;
}) {
  const [editor] = useLexicalComposerContext();

  return (
    <button
      className="toolbar-button"
      title={label}
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        command(editor);
      }}>
      {children}
    </button>
  );
}

function Divider() {
  return <div className="toolbar-divider" />;
}

function formatHeading(editor: LexicalEditor, tag: 'h2' | 'h3') {
  editor.update(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => $createHeadingNode(tag));
    }
  });
}

function formatParagraph(editor: LexicalEditor) {
  editor.update(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => $createParagraphNode());
    }
  });
}

function UndoIcon() {
  return (
    <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 24 24">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-2" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 24 24">
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H10a6 6 0 0 0 0 12h2" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 24 24">
      <path d="M21 12a9 9 0 0 1-14.8 6.9L3 16" />
      <path d="M3 21v-5h5" />
      <path d="M3 12A9 9 0 0 1 17.8 5.1L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function AlignLeftIcon() {
  return (
    <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 24 24">
      <path d="M4 6h16" />
      <path d="M4 10h10" />
      <path d="M4 14h16" />
      <path d="M4 18h10" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 24 24">
      <path d="M4 6h16" />
      <path d="M7 10h10" />
      <path d="M4 14h16" />
      <path d="M7 18h10" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 24 24">
      <path d="M4 6h16" />
      <path d="M10 10h10" />
      <path d="M4 14h16" />
      <path d="M10 18h10" />
    </svg>
  );
}

function serializeEditorState(editorState: EditorState, editor: LexicalEditor) {
  let html = '';

  editorState.read(() => {
    html = $generateHtmlFromNodes(editor);
  });

  return html;
}

const lexicalTheme = {
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
  },
};

const styles = `
  :root {
    color-scheme: light dark;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    height: 100%;
  }

  body {
    margin: 0;
    background: transparent;
  }

  .editor-shell {
    position: relative;
    height: 100%;
    min-height: 100%;
    color: #11181c;
    background: #ffffff;
    overflow: hidden;
  }

  .editor-shell.dark {
    color: #ecedee;
    background: #151718;
  }

  .toolbar {
    position: absolute;
    left: 50%;
    bottom: 12px;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: calc(100% - 24px);
    min-width: min(420px, calc(100% - 24px));
    min-height: 48px;
    padding: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 8px 24px rgba(17, 24, 28, 0.16);
    transform: translateX(-50%);
    transition:
      opacity 180ms ease,
      transform 180ms ease;
  }

  .toolbar-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, calc(100% + 18px));
  }

  .dark .toolbar {
    background: rgba(21, 23, 24, 0.94);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.36);
  }

  .toolbar-tools-wrap {
    position: relative;
    min-width: 0;
    overflow: hidden;
  }

  .toolbar-tools-wrap::before,
  .toolbar-tools-wrap::after {
    position: absolute;
    top: 0;
    bottom: 5px;
    z-index: 1;
    width: 28px;
    content: "";
    pointer-events: none;
  }

  .toolbar-tools-wrap::before {
    left: 0;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0));
  }

  .toolbar-tools-wrap::after {
    right: 0;
    background: linear-gradient(270deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0));
  }

  .dark .toolbar-tools-wrap::before {
    background: linear-gradient(90deg, rgba(21, 23, 24, 0.94), rgba(21, 23, 24, 0));
  }

  .dark .toolbar-tools-wrap::after {
    background: linear-gradient(270deg, rgba(21, 23, 24, 0.94), rgba(21, 23, 24, 0));
  }

  .toolbar-tools {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0 12px;
    scroll-padding-inline: 12px;
    scrollbar-color: rgba(104, 112, 118, 0.72) transparent;
    scrollbar-width: thin;
    -webkit-overflow-scrolling: touch;
  }

  .toolbar-tools::-webkit-scrollbar {
    height: 4px;
    background: transparent;
  }

  .toolbar-tools::-webkit-scrollbar-track {
    background: transparent;
  }

  .toolbar-tools::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(104, 112, 118, 0.72);
  }

  .toolbar-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    min-width: 32px;
    height: 32px;
    border: 1px solid transparent;
    border-radius: 6px;
    color: inherit;
    background: transparent;
    font: 700 14px/1 system-ui, sans-serif;
    cursor: pointer;
  }

  .sync-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 32px;
    border: 1px solid transparent;
    border-radius: 999px;
    padding: 0 12px;
    color: #ffffff;
    background: #0a7ea4;
    font: 700 14px/1 system-ui, sans-serif;
    cursor: pointer;
  }

  .sync-button:disabled {
    cursor: default;
    opacity: 0.68;
  }

  .toolbar-button:hover,
  .toolbar-button:focus-visible,
  .sync-button:not(:disabled):hover,
  .sync-button:not(:disabled):focus-visible {
    background: rgba(10, 126, 164, 0.12);
    outline: none;
  }

  .sync-button:not(:disabled):hover,
  .sync-button:not(:disabled):focus-visible {
    background: #086d8f;
  }

  .toolbar-icon {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .format-italic {
    font-style: italic;
  }

  .format-underline {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .heading-icon {
    display: inline-block;
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 700;
    line-height: 1;
  }

  .heading-icon-main {
    font-size: 20px;
  }

  .heading-icon-sub {
    font-size: 15px;
  }

  .toolbar-divider {
    flex: 0 0 auto;
    width: 1px;
    height: 24px;
    margin: 0 2px;
    background: #d4dadd;
  }

  .dark .toolbar-divider {
    background: #3c4449;
  }

  .editor-input {
    position: relative;
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 0 0 112px;
    outline: none;
    font-size: 16px;
    line-height: 1.55;
  }

  .editor-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    color: #687076;
    pointer-events: none;
  }

  .dark .editor-placeholder {
    color: #9ba1a6;
  }

  .editor-paragraph {
    margin: 0 0 12px;
  }

  .editor-quote {
    margin: 0 0 12px;
    padding-left: 14px;
    border-left: 3px solid #0a7ea4;
    color: #687076;
  }

  .editor-text-bold {
    font-weight: 700;
  }

  .editor-text-italic {
    font-style: italic;
  }

  .editor-text-underline {
    text-decoration: underline;
  }
`;
