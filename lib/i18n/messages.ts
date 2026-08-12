import englishMessages from "./messages/en-IN";

type WidenMessages<T> = {
  [Key in keyof T]: T[Key] extends string ? string : WidenMessages<T[Key]>;
};

export type Messages = WidenMessages<typeof englishMessages>;
export type MessageNamespace = keyof Messages;
export type MessageName<Namespace extends MessageNamespace> = keyof Messages[Namespace] &
  string;
export type MessageKey = {
  [Namespace in MessageNamespace]: `${Namespace}.${MessageName<Namespace>}`;
}[MessageNamespace];
export type InterpolationValues = Record<
  string,
  string | number | boolean | bigint | null | undefined
>;

export function interpolateMessage(
  template: string,
  values: InterpolationValues = {},
) {
  return template.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (placeholder, name) => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) return placeholder;
    const value = values[name];
    return value === null || value === undefined ? "" : String(value);
  });
}

export function messageFor(
  messages: Messages,
  key: MessageKey,
  values?: InterpolationValues,
) {
  const [namespace, name] = key.split(".") as [MessageNamespace, string];
  if (name === "__proto__" || name === "constructor" || name === "prototype") {
    return key;
  }
  const namespaceMessages = messages[namespace] as Record<string, string>;
  const template = Object.prototype.hasOwnProperty.call(namespaceMessages, name)
    ? namespaceMessages[name]
    : undefined;
  return template ? interpolateMessage(template, values) : key;
}

export function createTranslator(messages: Messages) {
  return (key: MessageKey, values?: InterpolationValues) =>
    messageFor(messages, key, values);
}

export { englishMessages };
