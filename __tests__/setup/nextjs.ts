/**
 * Next.js test setup
 */

// Mock Next.js Request/Response
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(public url: string, public init?: RequestInit) {}
    
    get method() {
      return this.init?.method || 'GET';
    }
    
    get headers() {
      return new Headers(this.init?.headers);
    }
    
    json() {
      return Promise.resolve(this.init?.body ? JSON.parse(this.init.body as string) : {});
    }
    
    text() {
      return Promise.resolve(this.init?.body as string || '');
    }
  } as any;
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(
      public body?: BodyInit | null,
      public init?: ResponseInit
    ) {}
    
    get status() {
      return this.init?.status || 200;
    }
    
    get statusText() {
      return this.init?.statusText || 'OK';
    }
    
    get headers() {
      return new Headers(this.init?.headers);
    }
    
    json() {
      if (typeof this.body === 'string') {
        return Promise.resolve(JSON.parse(this.body));
      }
      return Promise.resolve(this.body);
    }
    
    text() {
      return Promise.resolve(this.body as string || '');
    }
  } as any;
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    private headers: Map<string, string> = new Map();
    
    constructor(init?: HeadersInit) {
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value));
        } else if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value));
        } else {
          Object.entries(init).forEach(([key, value]) => this.set(key, value as string));
        }
      }
    }
    
    set(key: string, value: string) {
      this.headers.set(key.toLowerCase(), value);
    }
    
    get(key: string) {
      return this.headers.get(key.toLowerCase()) || null;
    }
    
    has(key: string) {
      return this.headers.has(key.toLowerCase());
    }
    
    delete(key: string) {
      this.headers.delete(key.toLowerCase());
    }
    
    forEach(callback: (value: string, key: string, parent: Headers) => void) {
      this.headers.forEach((value, key) => callback(value, key, this));
    }
    
    entries() {
      return this.headers.entries();
    }
    
    keys() {
      return this.headers.keys();
    }
    
    values() {
      return this.headers.values();
    }
  } as any;
}

// Mock performance
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    timeOrigin: Date.now()
  } as any;
}

export {};