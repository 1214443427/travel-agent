export function combineClassName(baseClass: string, externalClassName?: string) {
  if (externalClassName) {
    return baseClass + " " + externalClassName;
  } else {
    return baseClass;
  }
}
