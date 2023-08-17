(function($) {
    $.Offset = class {
        #top;
        #left;
        #width;
        #height;

        constructor([top, left, width, height]) {
            this.#top = top;
            this.#left = left;
            this.#width = width;
            this.#height = height;
        }

        get top() {
            return this.#top;
        }

        get left() {
            return this.#left
        }

        get width() {
            return this.#width;
        }

        get height() {
            return this.height();
        }
    };

    $.fn.absRelOffset = function () {
        let rect = this[0].getBoundingClientRect(),
            scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
            scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return new $.Offset([
            rect.top + scrollTop,
            rect.left + scrollLeft,
            this[0].offsetWidth,
            this[0].offsetHeight
        ]);
    };

    $.fn.positionPlacement = function (elm_Offset, placement) {
        let host = elm_Offset;

        if (host instanceof HTMLElement)
            host = $(host).absRelOffset();
        else if (host instanceof $.fn.init)
            host = host.absRelOffset();
        else if(!(host instanceof $.offset))
            throw new TypeError("hostElmOffset has to be an offset, jQuery object, or an HTMLElement");


        let target = this.absRelOffset();

        let left = host.left;
        let top = host.top;
        let diffX = Math.abs((host.width / 2) - (target.width / 2));
        let diffY = Math.abs((host.height / 2) - (target.height / 2));

        if (placement === 'top') {
            top = host.top - target.height;
        } else if (placement === 'left') {
            left = host.left - target.width
        } else if (placement === 'bottom') {
            top = host.top + host.height;
        } else if (placement === 'right') {
            left = host.left + host.width
        } else if (placement === 'top-left') {
            left = host.left - target.width;
            top = host.top - target.height;
        } else if (placement === 'top-right') {
            left = host.left + host.width;
            top = host.top - target.height;
        } else if (placement === 'bottom-left') {
            left = host.left - target.width;
            top = host.top + host.height;
        } else if (placement === 'bottom-right') {
            left = host.left + host.width;
            top = host.top + host.height;
        } else if (placement === 'top-center') {
            top = host.top - target.height;

            if (host.width > target.width)
                left = host.left + diffX;

            else if (host.width < target.width)
                left = host.left - diffX;
        } else if (placement === 'left-center') {
            left = host.left - target.width;

            if (host.height > target.height)
                top = host.top + diffY;

            else if (host.height < target.height)
                top = host.top - diffY;
        } else if (placement === 'bottom-center') {
            top = host.top + host.height;

            if (host.width > target.width)
                left = host.left + diffX;

            else if (host.width < target.width)
                left = host.left - diffX;
        } else if (placement === 'right-center') {
            left = host.left + host.width;

            if (host.height > target.height)
                top = host.top + diffY;

            else if (host.height < target.height)
                top = host.top - diffY;
        }

        return {
            x: left,
            y: top
        };
    };

    $.fn.relativePositionPlacement = function (elm_offset, placement) {
        let left = 0;
        let top = 0;

        let host = elm_offset;

        if (host instanceof HTMLElement)
            host = $(host).absRelOffset();
        else if (host instanceof $.fn.init)
            host = host.absRelOffset();
        else if(!(host instanceof $.offset))
            throw new TypeError("hostElmOffset has to be an offset, jQuery object, or an HTMLElement");

        let target = this.absRelOffset();

        let diffX = Math.abs((host.width / 2) - (target.width / 2));
        let diffY = Math.abs((host.height / 2) - (target.height / 2));

        if (placement === 'right') {
            left = host.width;
        } else if (placement === 'bottom') {
            top = host.height;
        } else if (placement === 'left') {
            left = -target.width;
        } else if (placement === 'top') {
            top = -target.height;
        } else if (placement === 'top-left') {
            top = -target.height;
            left = -target.width;
        } else if (placement === 'top-right') {
            top = -target.height;
            left = host.width;
        } else if (placement === 'bottom-left') {
            top = host.height;
            left = -target.width;
        } else if (placement === 'bottom-right') {
            top = host.height;
            left = host.width;
        } else if (placement === 'top-center') {
            top = -target.height;

            if (host.width > target.width)
                left = diffX;

            else if (host.width < target.width)
                left = -diffX;
        } else if (placement === 'bottom-center') {
            top = host.height;

            if (host.width > target.width)
                left = diffX;

            else if (host.width < target.width)
                left = -diffX;
        } else if (placement === 'left-center') {
            left = -target.width;

            if (host.height > target.height)
                top = diffY;

            else if (host.height < target.height)
                top = -diffY;
        } else if (placement === 'right-center') {
            left = host.width;

            if (host.height > target.height)
                top = diffY;

            else if (host.height < target.height)
                top = -diffY;
        }

        return {
            x: left,
            y: top
        };

    };

    $.fn.fixedOffset = function() {
        let outerPosition = function(jq) {
            let margin = jq.margin();
            let padding = jq.padding();
            let border = jq.border();

            return {
                x: margin.left + padding.left + border.left,
                y: margin.top + padding.top + border.top
            }
        }

        let offset = this.offset();
        let $doc = $(documnet);
        let bodyPos = outerPosition($(document.body));

        return new $.Offset([
            offset.top - $doc.scrollTop() + bodyPos.y,
            offset.left - $doc.scrollLeft() + bodyPos.x,
            this[0].offsetWidth,
            this[0].offsetHeight
        ])
    }

    $.fn.fixedPositionPlacement = function(elm, placement) {
        let host = elm;

        if(host instanceof HTMLElement)
            host = $(host).fixedOffset();
        else if(host instanceof $.fn.init)
            host = host.fixedOffset();
        else if(!(host instanceof $.offset))
            throw new TypeError("elm must be either an offset, a jQuery object, or an HTMLElement")

        let target = this.fixedOffset();

        let left = host.left;
        let top = host.top;
        let diffX = Math.abs((host.width / 2) - (target.width / 2));
        let diffY = Math.abs((host.height / 2) - (target.height / 2));

        if (placement === 'top') {
            top = host.top - target.height;
        } else if (placement === 'left') {
            left = host.left - target.width
        } else if (placement === 'bottom') {
            top = host.top + host.height;
        } else if (placement === 'right') {
            left = host.left + host.width
        } else if (placement === 'top-left') {
            left = host.left - target.width;
            top = host.top - target.height;
        } else if (placement === 'top-right') {
            left = host.left + host.width;
            top = host.top - target.height;
        } else if (placement === 'bottom-left') {
            left = host.left - target.width;
            top = host.top + host.height;
        } else if (placement === 'bottom-right') {
            left = host.left + host.width;
            top = host.top + host.height;
        } else if (placement === 'top-center') {
            top = host.top - target.height;

            if (host.width > target.width)
                left = host.left + diffX;

            else if (host.width < target.width)
                left = host.left - diffX;
        } else if (placement === 'left-center') {
            left = host.left - target.width;

            if (host.height > target.height)
                top = host.top + diffY;

            else if (host.height < target.height)
                top = host.top - diffY;
        } else if (placement === 'bottom-center') {
            top = host.top + host.height;

            if (host.width > target.width)
                left = host.left + diffX;

            else if (host.width < target.width)
                left = host.left - diffX;
        } else if (placement === 'right-center') {
            left = host.left + host.width;

            if (host.height > target.height)
                top = host.top + diffY;

            else if (host.height < target.height)
                top = host.top - diffY;
        }

        return {
            x: left,
            y: top
        };

    }

    $.fn.outterTagHtml = function() {
        let tagname = this.prop('tagName').toLowerCase();
        let html = '<' + tagname;
        $.each(this.get(0).attributes, function() {
            html += ' ' + this.name + '="' + this.value + '"';
        });
        html += '>';
        if(tagname !== 'hr' && tagname !== 'br' && tagname !== 'hr' && tagname !== 'input' && tagname !== 'link' && tagname !== 'meta' && tagname !== 'img' && tagname !== 'base')
            html += this.html() + '</' + tagname + '>';
        return html;
    }
})(jQuery);