/* eslint-env worker */
/* global self, Request */
/**
 * Worker Template for Serverless Functions
 * 
 * This code runs inside a Web Worker environment created by Deno.
 * Each worker is created fresh for a single request, executes once, and terminates.
 */

// Handle the single message with both code and request data
self.onmessage = async (e) => {
  const { code, requestData } = e.data;
  
  try {
    // Initialize function from code
    const wrapper = new Function('exports', 'module', code);
    const exports = {};
    const module = { exports };
    
    // Execute the wrapper to get the function
    wrapper(exports, module);
    
    // Get the exported function
    const functionHandler = module.exports || exports.default || exports;
    
    if (typeof functionHandler !== 'function') {
      throw new Error('No function exported. Expected: module.exports = async function(req) { ... }');
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
    const responseData = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    };
    
    self.postMessage({ success: true, response: responseData });
  } catch (error) {
    self.postMessage({ 
      success: false, 
      error: error.message || 'Unknown error' 
    });
  }
};