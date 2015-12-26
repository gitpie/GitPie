'use strict';

let container = document.querySelector('#global-container');

/**
 * @class GPNotification
 * @param title {String} Title of the notification
 * @param opts {object} Options to the notification
 *  - type {string} 'local' or 'global'
 *  - body {string} Body of the notification
 *  - showLoad {boolean} If true, show the loading icon for local notifications
 *  - autoclose {boolean} If true, the notification is close after 3 seconds visible
*/
class GPNotification {
  constructor (title, opts) {
    opts = opts || {};

    this.type = opts.type || 'local';
    this.title = title;
    this.body = opts.body;
    this.showLoad = opts.showLoad;
    this.notificationElement = null;
    this.autoclose = opts.autoclose;
  }

  pop() {
    let isGlobal = (this.type == 'global');
    let path = require('path');

    if (isGlobal) {
      new Notification(this.title, {
        body: this.body,
        icon: path.join(__dirname, 'resources', 'images', 'icon.png')
      });
    } else {
      var bodyText = (this.body && this.body.toUpperCase());
      var titleText = (this.title && this.title.toUpperCase());

      this.notificationElement = document.createElement('section');
      this.notificationElement.className = 'notify-dialog';

      if (this.showLoad) {
        this.notificationElement.innerHTML = `
          <section class="icon">
            <div class="loading-container">
              <div class="loading-content">
                <svg class="spinner" width="25px" height="25px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
                   <circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
                </svg>
              </div>
            </div>
          </section>
        `;
      } else {
        this.notificationElement.innerHTML = '';
      }

      this.notificationElement.innerHTML += `<section class="content">${bodyText || titleText}</section>`;

      container.appendChild(this.notificationElement);

      setTimeout(function () {
        this.notificationElement.style.marginBottom = '10px';
      }.bind(this), 100);

      if (this.autoclose) {
        setTimeout(function () {
          this.close();
        }.bind(this), 3000);
      }
    }
  }

  close() {
    this.notificationElement.style.marginBottom = '-100px';

    setTimeout(function () {
      container.removeChild(this.notificationElement);
    }.bind(this), 1000);
  }
}

window.GPNotification = GPNotification;
