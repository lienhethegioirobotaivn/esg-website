import Image from "@tiptap/extension-image";

export const ImageBlock = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") ?? "center",
        renderHTML: (attributes) => ({ "data-align": attributes["align"] }),
      },
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") ?? "",
        renderHTML: (attributes) =>
          attributes["caption"] ? { "data-caption": attributes["caption"] } : {},
      },
      width: {
        default: 100,
        parseHTML: (element) => Number(element.getAttribute("data-width")) || 100,
        renderHTML: (attributes) => ({
          "data-width": attributes["width"],
          style: `width:${attributes["width"]}%`,
        }),
      },
    };
  },
}).configure({ inline: false, allowBase64: false });
