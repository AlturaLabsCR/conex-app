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
  $applyNodeReplacement,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  DecoratorNode,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  REDO_COMMAND,
  type EditorState,
  type LexicalNode,
  type LexicalEditor,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
  UNDO_COMMAND,
} from 'lexical';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type RichTextEditorContentProps = {
  initialHtml: string;
  isDirty: boolean;
  isDark: boolean;
  isSaving: boolean;
  hideToolbarScrollbar?: boolean;
  keyboardInset?: number;
  onHtmlChange?: (html: string) => void;
  onSync?: () => void | Promise<void>;
};

export function RichTextEditorContent({
  initialHtml,
  hideToolbarScrollbar,
  isDirty,
  isDark,
  isSaving,
  keyboardInset,
  onHtmlChange,
  onSync,
}: RichTextEditorContentProps) {
  const editorInputRef = useRef<HTMLDivElement>(null);
  const resolvedKeyboardInset = useViewportKeyboardInset(keyboardInset);
  const isKeyboardVisible = resolvedKeyboardInset > 0;
  const keyboardEditorLift = resolvedKeyboardInset > 0 ? 48 : 0;
  const editorBottomPadding = 88 + resolvedKeyboardInset;
  const editorTopPadding = keyboardEditorLift;
  useKeepSelectionVisible(editorInputRef, editorBottomPadding, isKeyboardVisible);

  const initialConfig = useMemo(
    () => ({
      namespace: 'ConexEditor',
      nodes: [HeadingNode, QuoteNode, ImageNode],
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

  return (
    <div
      className={[
        'editor-shell',
        isDark ? 'dark' : '',
        hideToolbarScrollbar ? 'hide-toolbar-scrollbar' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ transform: `translateY(-${keyboardEditorLift}px)` }}>
      <style>{styles}</style>
      <LexicalComposer initialConfig={initialConfig}>
        <Toolbar
          bottom={12 + resolvedKeyboardInset}
          isDirty={isDirty}
          isSaving={isSaving}
          onSync={onSync}
        />
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              ref={editorInputRef}
              className="editor-input"
              style={{
                paddingBottom: editorBottomPadding,
                paddingTop: editorTopPadding,
                scrollPaddingBottom: editorBottomPadding,
                scrollPaddingTop: editorTopPadding,
              }}
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

function useViewportKeyboardInset(keyboardInset?: number) {
  const [viewportKeyboardInset, setViewportKeyboardInset] = useState(0);

  useEffect(() => {
    const visualViewport = window.visualViewport;

    if (typeof keyboardInset === 'number') {
      setViewportKeyboardInset(keyboardInset);
      return;
    }

    if (!visualViewport) {
      return;
    }

    const updateKeyboardInset = () => {
      const nextKeyboardInset = Math.max(
        0,
        window.innerHeight - visualViewport.height - visualViewport.offsetTop
      );

      setViewportKeyboardInset(nextKeyboardInset);
    };

    updateKeyboardInset();
    visualViewport.addEventListener('resize', updateKeyboardInset);
    visualViewport.addEventListener('scroll', updateKeyboardInset);

    return () => {
      visualViewport.removeEventListener('resize', updateKeyboardInset);
      visualViewport.removeEventListener('scroll', updateKeyboardInset);
    };
  }, [keyboardInset]);

  return viewportKeyboardInset;
}

function useKeepSelectionVisible(
  editorInputRef: React.RefObject<HTMLDivElement | null>,
  bottomPadding: number,
  isKeyboardVisible: boolean
) {
  const previousBottomPaddingRef = useRef(bottomPadding);

  const scrollSelectionIntoView = useCallback(() => {
    const editorInput = editorInputRef.current;

    if (!isKeyboardVisible || !editorInput || document.activeElement !== editorInput) {
      return;
    }

    const selection = document.getSelection();
    const focusNode = selection?.focusNode;

    if (!selection || selection.rangeCount === 0 || !focusNode || !editorInput.contains(focusNode)) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rangeRects = range.getClientRects();
    const selectionRect =
      rangeRects[rangeRects.length - 1] ??
      (focusNode.nodeType === Node.ELEMENT_NODE
        ? (focusNode as Element).getBoundingClientRect()
        : focusNode.parentElement?.getBoundingClientRect());

    if (!selectionRect) {
      return;
    }

    const editorRect = editorInput.getBoundingClientRect();
    const visibleBottom = editorRect.bottom - bottomPadding + 16;

    if (selectionRect.bottom > visibleBottom) {
      editorInput.scrollTop += selectionRect.bottom - visibleBottom;
    }
  }, [bottomPadding, editorInputRef, isKeyboardVisible]);

  const scheduleSelectionScroll = useCallback(() => {
    if (!isKeyboardVisible) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollSelectionIntoView);
    });
  }, [isKeyboardVisible, scrollSelectionIntoView]);

  useEffect(() => {
    const previousBottomPadding = previousBottomPaddingRef.current;
    previousBottomPaddingRef.current = bottomPadding;

    if (!isKeyboardVisible || bottomPadding <= previousBottomPadding) {
      return;
    }

    scheduleSelectionScroll();
    const settleTimeout = window.setTimeout(scrollSelectionIntoView, 180);
    const finalTimeout = window.setTimeout(scrollSelectionIntoView, 360);

    return () => {
      window.clearTimeout(settleTimeout);
      window.clearTimeout(finalTimeout);
    };
  }, [bottomPadding, isKeyboardVisible, scheduleSelectionScroll, scrollSelectionIntoView]);

  useEffect(() => {
    document.addEventListener('selectionchange', scheduleSelectionScroll);

    return () => {
      document.removeEventListener('selectionchange', scheduleSelectionScroll);
    };
  }, [scheduleSelectionScroll]);

  return scheduleSelectionScroll;
}

function Toolbar({
  bottom,
  isDirty,
  isSaving,
  onSync,
}: {
  bottom: number;
  isDirty: boolean;
  isSaving: boolean;
  onSync?: () => void | Promise<void>;
}) {
  return (
    <div
      className="toolbar"
      style={{ bottom }}
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
          <Divider />
          <ImageToolbarButton />
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

function ImageToolbarButton() {
  const [editor] = useLexicalComposerContext();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const insertImage = useCallback(
    (src: string, altText: string) => {
      editor.update(() => {
        insertImageOnEmptyLine({ altText, src });
      });
    },
    [editor]
  );

  return (
    <>
      <button
        className="toolbar-button"
        title="Insert image"
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          inputRef.current?.click();
        }}>
        <ImageIcon />
      </button>
      <input
        ref={inputRef}
        accept="image/*"
        className="image-input"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (!file) {
            return;
          }

          const reader = new FileReader();

          reader.addEventListener('load', () => {
            if (typeof reader.result === 'string') {
              insertImage(reader.result, file.name);
            }
          });
          reader.readAsDataURL(file);
          event.target.value = '';
        }}
      />
    </>
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

function insertImageOnEmptyLine({ altText, src }: { altText: string; src: string }) {
  const selection = $getSelection();

  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    const topLevelNode = selection.anchor.getNode().getTopLevelElement();

    if (topLevelNode && topLevelNode.getTextContentSize() > 0) {
      selection.insertParagraph();
    }
  }

  const nextParagraph = $createParagraphNode();

  $insertNodes([$createImageNode({ altText, src }), nextParagraph]);
  nextParagraph.select();
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

function ImageIcon() {
  return (
    <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8" cy="10" r="1.5" />
      <path d="m21 15-5-5L5 19" />
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

type SerializedImageNode = Spread<
  {
    altText: string;
    src: string;
  },
  SerializedLexicalNode
>;

class ImageNode extends DecoratorNode<React.JSX.Element> {
  __altText: string;
  __src: string;

  static getType() {
    return 'image';
  }

  static clone(node: ImageNode) {
    return new ImageNode(node.__src, node.__altText, node.__key);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: (node: HTMLElement) => ({
        conversion: () => {
          const image = node as HTMLImageElement;
          const src = image.getAttribute('src') ?? '';

          if (!src) {
            return null;
          }

          return {
            node: $createImageNode({
              altText: image.getAttribute('alt') ?? '',
              src,
            }),
          };
        },
        priority: 1,
      }),
    };
  }

  static importJSON(serializedNode: SerializedImageNode) {
    return $createImageNode({
      altText: serializedNode.altText,
      src: serializedNode.src,
    });
  }

  constructor(src: string, altText: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
  }

  createDOM(_config: EditorConfig) {
    const span = document.createElement('span');
    span.className = 'editor-image-node';
    return span;
  }

  updateDOM() {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement('img');
    img.setAttribute('src', this.__src);

    if (this.__altText) {
      img.setAttribute('alt', this.__altText);
    }

    return { element: img };
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.__altText,
      src: this.__src,
      type: 'image',
      version: 1,
    };
  }

  getTextContent() {
    return this.__altText;
  }

  decorate() {
    return <EditorImage altText={this.__altText} nodeKey={this.__key} src={this.__src} />;
  }
}

function $createImageNode({ altText, src }: { altText: string; src: string }) {
  return $applyNodeReplacement(new ImageNode(src, altText));
}

function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}

function EditorImage({
  altText,
  nodeKey,
  src,
}: {
  altText: string;
  nodeKey: NodeKey;
  src: string;
}) {
  const [editor] = useLexicalComposerContext();

  const removeImage = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);

      if ($isImageNode(node)) {
        node.remove();
      }
    });
  }, [editor, nodeKey]);

  return (
    <span className="editor-image-wrap" contentEditable={false}>
      <img alt={altText} className="editor-image" draggable={false} src={src} />
      <button
        aria-label="Remove image"
        className="image-remove-button"
        title="Remove image"
        type="button"
        onClick={removeImage}>
        x
      </button>
    </span>
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
    border: 1px solid #d5dce1;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 6px 16px rgba(17, 24, 28, 0.1);
    transform: translateX(-50%);
    transition:
      opacity 180ms ease,
      transform 180ms ease;
  }

  .dark .toolbar {
    border-color: #343a3e;
    background: rgba(21, 23, 24, 0.94);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.24);
  }

  .toolbar-tools-wrap {
    position: relative;
    min-width: 0;
    margin-inline: 8px;
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
    padding: 0;
    scroll-padding-inline: 4px;
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

  .image-input {
    display: none;
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

  .editor-image-node {
    display: block;
    margin: 16px 0;
  }

  .editor-image-wrap {
    position: relative;
    display: inline-block;
    max-width: 100%;
    line-height: 0;
  }

  .editor-image {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }

  .image-remove-button {
    position: absolute;
    top: 8px;
    right: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid rgba(255, 255, 255, 0.72);
    border-radius: 999px;
    color: #ffffff;
    background: rgba(17, 24, 28, 0.72);
    font: 700 16px/1 system-ui, sans-serif;
    cursor: pointer;
    opacity: 0;
    transition:
      background 160ms ease,
      opacity 160ms ease;
  }

  .editor-image-wrap:hover .image-remove-button,
  .editor-image-wrap:focus-within .image-remove-button,
  .image-remove-button:focus-visible {
    opacity: 1;
  }

  .image-remove-button:hover,
  .image-remove-button:focus-visible {
    background: rgba(180, 35, 24, 0.9);
    outline: none;
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
    padding: 0 0 88px;
    scroll-padding-bottom: 88px;
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

  .hide-toolbar-scrollbar .toolbar-tools {
    scrollbar-width: none;
  }

  .hide-toolbar-scrollbar .toolbar-tools::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 600px) {
    .image-remove-button {
      opacity: 1;
    }
  }
`;
