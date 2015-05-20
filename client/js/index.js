$(document).ready(function () {
    (function (root) {
        function Ui() {
            this.repository = new Ui.Repository();
        }
        Ui.Repository = function () {
            this._ = $(".popup-create-new-repository");
        }
        Ui.Repository.prototype.popup = function (f) {
            this._[f]();
        };

        function GitHub() {
            this.ui = new Ui();
        }

        this.GitHub = new GitHub();
    })(window);

    $(".main-container").split({
        limit: 100
      , orientation: "vertical"
    });

    $(".create-repository").on("click", function () {
        GitHub.ui.repository.popup("toggle");
        return false;
    });
});

