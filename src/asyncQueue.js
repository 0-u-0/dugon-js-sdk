export default class AsyncQueue {
  constructor() {
    this.running = false;
    this.queue = new Array();
  }

  push(execObj, task, parameter) {
    if (this.running) {
      this.queue.push([execObj, task, parameter]);
    } else {
      this.running = true;
      this.executeTask(execObj, task, parameter);
    }
  }

  executeTask(execObj, task, parameter) {
    task.call(execObj, parameter).then(() => {
      if (this.queue.length > 0) {
        let [nextExecObj, nextTask, nextParameter] = this.queue.shift();
        this.executeTask(nextExecObj, nextTask, nextParameter);
      } else {
        this.running = false;
      }
    });
  }

}









