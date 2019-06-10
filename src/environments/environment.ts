// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  root_node: 'A1',                              // Name of the root node in the graph.
  websocket_url: 'ws://localhost:8080/jsonrpc', // CTM API endpoint
  false_alarm_value: 0,                         // The value that indicates if an alarm is off.
  subscription_interval: 100,                   // How often the Server should return new signal values (in ms).
  graph_display_settings: {
    size: 30, // size of node graph
    margin: '2', // spacing
  },
  node_animation_settings: {  // settings for animating sensor signal updates
    animate_sensors: true,    // wether to animate opacity for sensor signal updates
    animate_alarms: true,     // wether to update colors for alarm signal updates
    minFill: 0,               // opacity when update detected
    maxFill: .8,              // opacity when update animation is done
    fps: 30,                  // how many frames of animation for the update animation. higher -> smoother animation
    cooldown: 1,              // how long the animation should last in seconds
    inc: null,                // NOTE: null because this is a function. must be set in 'viz.component.ts'. Delta opacity change per frame
    freq: null                // NOTE: null because this is a function. must be set in 'viz.component.ts'. Increments per frame
  },
  node_style_settings: { // color and font settings for nodes
    alarm: {
      color_off: '#0EF942', // color when no alarm
      color_on: '#DC3545',  // color when alarm
      edge_color: 'black',
      shape: 'diamond',
      height: 2,
      width: 2
    },
    sensor: {
      color: 'lightGreen',
      edge_color: 'lightGreen',
      shape: 'circle'
    },
    font: "'Roboto', sans-serif", // color for all nodes and labels
  },  
  zoom_scale_timeout: 100,        // retry interval for activating zoom and scale functionality in milliseconds
  zoom_scale_settings: { 
    zoomScaleSensitivity: 0.5,    // scroll wheel sensitivity.
    minZoom: .2,                  // lower value -> can zoom out farther
    maxZoom: 2,                   // higher value -> can zoom in farther
    dblClickZoomEnabled: false,   // activate doubleClick to zoom in
    fit: false,                 
    contain: true
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
