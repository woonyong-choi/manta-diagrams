import {Plugin, MarkdownRenderChild, Modal, sanitizeHTMLToDom} from 'obsidian';
import {diagramAt} from './document.mjs';
import {mountViewer} from './viewer.mjs';

class DiagramModal extends Modal {
  constructor(app, source) {super(app); this.source = source;}
  onOpen() {
    this.setTitle('Manta Diagrams');
    this.modalEl.classList.add('manta-diagrams-modal');
    this.dispose = mountViewer(this.contentEl, this.source, {sanitize: sanitizeHTMLToDom,
      dark: document.body.classList.contains('theme-dark')});
  }
  onClose() {this.dispose?.();}
}

class InlineDiagram extends MarkdownRenderChild {
  constructor(element, source, inline = false, open) {super(element); this.source = source; this.inline = inline; this.open = open;}
  onload() {this.dispose = mountViewer(this.containerEl, this.source, {sanitize: sanitizeHTMLToDom,
    dark: document.body.classList.contains('theme-dark'), inline: this.inline, open: this.open});}
  onunload() {this.dispose?.();}
}

export default class MantaDiagrams extends Plugin {
  openDiagram(source) {
    this.viewer?.close();
    this.viewer = new DiagramModal(this.app, source);
    this.viewer.open();
  }
  onunload() {this.viewer?.close();}
  onload() {
    this.addCommand({id: 'open-diagram', name: 'Open diagram under cursor',
      editorCheckCallback: (checking, editor) => {
        const selected = editor.getSelection();
        const source = selected.trim() ? (diagramAt(selected.trim(), 0) ?? selected.trim()) : diagramAt(editor.getValue(), editor.getCursor().line);
        if (!source) return false;
        if (!checking) this.openDiagram(source);
        return true;
      }});
    this.registerMarkdownCodeBlockProcessor('manta', (source, element, context) => {
      context.addChild(new InlineDiagram(element, source));
    });
    this.registerMarkdownCodeBlockProcessor('mermaid', (source, element, context) => {
      context.addChild(new InlineDiagram(element, source, true, () => this.openDiagram(source)));
    }, -100);
  }
}
