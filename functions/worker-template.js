/**
 * Worker Template for Serverless Functions
 *
 * This code runs inside a Web Worker environment created by Deno.
 * Each worker is created fresh for a single request, executes once, and terminates.
 */
/* eslint-env worker */
/* global self, Request, Deno */

// Import SDK at worker level - this will be available to all functions
import { createClient } from 'npm:@insforge/sdk';

// Handle the single message with code, request data, and secrets
self.onmessage = async (e) => {
  const { code, requestData, secrets = {} } = e.data;

  try {
    // Create a mock Deno object with env containing the secrets
    const mockDeno = {
      env: {
        get: (key) => secrets[key] || undefined,
        set: (key, value) => { secrets[key] = value; },
        has: (key) => key in secrets,
        toObject: () => ({ ...secrets }),
        delete: (key) => { delete secrets[key]; return true; }
      },
      // Include version info for compatibility
      version: typeof Deno !== 'undefined' ? Deno.version : { 
        deno: '1.0.0',
        v8: '10.0.0',
        typescript: '4.9.0'
      }
    };

    // Initialize function from code with SDK and mock Deno available
    const wrapper = new Function('exports', 'module', 'createClient', 'Deno', code);
    const exports = {};
    const module = { exports };

    // Execute the wrapper with createClient and mockDeno injected
    wrapper(exports, module, createClient, mockDeno);

    // Get the exported function
    const functionHandler = module.exports || exports.default || exports;

    if (typeof functionHandler !== 'function') {
      throw new Error(
        'No function exported. Expected: module.exports = async function(req) { ... }'
      );
    }

    // Create Request object from data
    const request = new Request(requestData.url, {
      method: requestData.method,
      headers: requestData.headers,
      body: requestData.body,
    });

    // Execute the function
    const response = await functionHandler(request);

    // Serialize and send response
    // Properly handle responses with no body
    let body = null;
    
    // Only read body if response has content
    // Status codes 204, 205, and 304 should not have a body
    if (![204, 205, 304].includes(response.status)) {
      body = await response.text();
    }
    
    const responseData = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      body: body,
    };

    self.postMessage({ success: true, response: responseData });
  } catch (error) {
    // Check if the error is actually a Response object (thrown by the function)
    if (error instanceof Response) {
      // Handle error responses the same way
      let body = null;
      
      if (![204, 205, 304].includes(error.status)) {
        body = await error.text();
      }
      
      const responseData = {
        status: error.status,
        statusText: error.statusText,
        headers: Object.fromEntries(error.headers),
        body: body,
      };
      self.postMessage({ success: true, response: responseData });
    } else {
      // For actual errors, include status if available
      self.postMessage({
        success: false,
        error: error.message || 'Unknown error',
        status: error.status || 500,
      });
    }
  }
};
