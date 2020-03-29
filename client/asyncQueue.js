export default class AsyncQueue {
  constructor() {
    this.running = false;
    this.queue = new Array();
  }

  push(task, parameter) {
    if (this.running) {
      this.queue.push([task, parameter]);
    } else {
      this.running = true;
      this.executeTask(task, parameter);
    }
  }

  executeTask(task, parameter) {
    task(parameter).then(() => {
      if (this.queue.length > 0) {
        let [nextTask, parameter] = this.queue.shift();
        this.executeTask(nextTask, parameter);
      } else {
        this.running = false;
      }
    });
  }

}


// function t1(time) {
//   return new Promise((y, n) => {
//     setTimeout(function () {
//       console.log(time);
//       console.log(new Date())
//       y();
//     }, time);
//   });
// }

// let a = new AsyncQueue();
// a.push(t1, 1000);
// a.push(t1, 3000);









