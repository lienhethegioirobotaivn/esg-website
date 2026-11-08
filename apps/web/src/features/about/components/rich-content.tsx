import type { RichBlock, RichDoc, RichInline, RichMark } from "@esg/shared";
import type { CSSProperties, ReactNode } from "react";

interface RichContentProps {
  doc: RichDoc;
  className?: string;
}

function alignStyle(align: string | undefined): CSSProperties | undefined {
  return align && align !== "left"
    ? { textAlign: align as CSSProperties["textAlign"] }
    : undefined;
}

function renderMarks(
  marks: RichMark[] | undefined,
  node: ReactNode,
): ReactNode {
  let result = node;
  for (const mark of marks ?? []) {
    if (mark.type === "bold") {
      result = <strong>{result}</strong>;
    } else if (mark.type === "italic") {
      result = <em>{result}</em>;
    } else if (mark.type === "underline") {
      result = <u>{result}</u>;
    } else {
      result = (
        <a
          href={mark.attrs.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          {result}
        </a>
      );
    }
  }
  return result;
}

function renderInline(content: RichInline[] | undefined): ReactNode {
  return (content ?? []).map((item, index) =>
    item.type === "hardBreak" ? (
      <br key={index} />
    ) : (
      <span key={index}>{renderMarks(item.marks, item.text)}</span>
    ),
  );
}

function renderBlocks(blocks: RichBlock[]): ReactNode {
  return blocks.map((block, index) => {
    switch (block.type) {
      case "paragraph":
        return (
          <p key={index} style={alignStyle(block.attrs?.textAlign)}>
            {renderInline(block.content)}
          </p>
        );
      case "heading": {
        const style = alignStyle(block.attrs.textAlign);
        return block.attrs.level === 2 ? (
          <h2 key={index} style={style}>
            {renderInline(block.content)}
          </h2>
        ) : (
          <h3 key={index} style={style}>
            {renderInline(block.content)}
          </h3>
        );
      }
      case "image":
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={index}
            src={block.attrs.src}
            alt={block.attrs.alt}
            data-align={block.attrs.align}
            loading="lazy"
            style={{ width: `${block.attrs.width}%` }}
          />
        );
      case "blockquote":
        return (
          <blockquote key={index}>{renderBlocks(block.content)}</blockquote>
        );
      case "bulletList":
        return (
          <ul key={index}>
            {block.content.map((item, position) => (
              <li key={position}>{renderBlocks(item.content)}</li>
            ))}
          </ul>
        );
      case "orderedList":
        return (
          <ol key={index}>
            {block.content.map((item, position) => (
              <li key={position}>{renderBlocks(item.content)}</li>
            ))}
          </ol>
        );
      case "horizontalRule":
        return <hr key={index} />;
    }
  });
}

export function RichContent({ doc, className }: RichContentProps) {
  return (
    <div className={className ? `rich-content ${className}` : "rich-content"}>
      {renderBlocks(doc.content)}
    </div>
  );
}
