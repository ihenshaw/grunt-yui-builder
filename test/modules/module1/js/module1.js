/**
* Module 1
*/
(function (Y) {

    var CLASS_NAME = 'module1';

    /**
    * @constructor
    */
    function Module1() {
        Module1.superclass.constructor.apply(this, arguments);
    }

    Y.mix(Module1, {
        /**
        * @property Module1
        * @static
        * @default 'module1'
        */
        NAME: CLASS_NAME,

        /**
        * Attribute specifier
        * @property Module1
        * @static
        */
        ATTRS : {

        }
    });

    Y.extend(Module1, Y.Base, {

        Y.log("Log me");
    });

    Y.Module1 = Module1;

}(Y));
