export function combineClassName(baseClass: string, externalClassName?: string) {
  if (externalClassName) {
    return baseClass + " " + externalClassName;
  } else {
    return baseClass;
  }
}

type QueryOptions = Record<string, string | number | boolean | undefined>;

export function constructUrl(base: string, options: QueryOptions) {
  const endpoint = new URL(base);

  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      endpoint.searchParams.set(key, String(value));
    }
  });

  return endpoint;
}
