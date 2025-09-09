import '@testing-library/jest-dom'

// Mock Next.js Request/Response for API tests
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(url, init) {
      this._url = url;
      this.init = init;
    }
    
    get url() {
      return this._url;
    }
    
    get method() {
      return this.init?.method || 'GET';
    }
    
    get headers() {
      return new Headers(this.init?.headers);
    }
    
    json() {
      return Promise.resolve(this.init?.body ? JSON.parse(this.init.body) : {});
    }
    
    text() {
      return Promise.resolve(this.init?.body || '');
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.init = init;
    }
    
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
      return Promise.resolve(this.body || '');
    }
    
    static json(data, init) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          ...init?.headers,
          'content-type': 'application/json'
        }
      });
    }
  }
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this.headers = new Map();
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value));
        } else if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value));
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => this.set(key, value));
        }
      }
    }
    
    set(key, value) {
      this.headers.set(key.toLowerCase(), value);
    }
    
    get(key) {
      return this.headers.get(key.toLowerCase()) || null;
    }
    
    has(key) {
      return this.headers.has(key.toLowerCase());
    }
    
    delete(key) {
      this.headers.delete(key.toLowerCase());
    }
    
    forEach(callback) {
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
  }
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return []
  }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})