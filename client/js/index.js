var $ = require("jquery");
(function (root) {
    function Ui() {}
    Ui.Repository = function () {}
    Ui.Repository.prototype.popup = function (show) {

    };
    Ui.repository = new Ui.Repository();
    function GitHub() {
    }
    GitHub.ui = new Ui();
    this.GitHub = new GitHub();
})(this);
