import 'jquery.transit'
import FileSaver from 'filesaverjs'

import DisplacePass from './displace-pass'
import BasePass from './base-pass'

import Ticker from './ticker'

export default class Easel {

    constructor() {

        this.$canvas = $('#canvas')
        this.$easel = $('.easel')
        this.$wrapper = $('.canvas-wrapper')

        this.$cursor = $('.brush-cursor')

        // create renderer
        window.renderer = new THREE.WebGLRenderer({
            canvas: this.$canvas[0],
            preserveDrawingBuffer: true

        })
        window.renderer.setClearColor(0x000000)

        // init passes
        this.displacePass = new DisplacePass()

        this.renderPass = new BasePass({
            fragmentShader: require('./shaders/render-pass.frag'),
            uniforms: {
                tex: {type: 't', value: this.displacePass.texture}
            }
        })

        this._setResolution(1024, 1024)

        this.textureLoader = new THREE.TextureLoader()

        Ticker.on('update', this._update.bind(this))
        this._update()

        $(window).on('resize', this._updateTransform.bind(this))
        this._updateTransform()

        this.$canvas.on({
            'mousedown': () => Ticker.start(),
            'mouseup': () => Ticker.stop()
        })

        this.$easel.on({
            'mouseenter': this._showCursor.bind(this),
            'mouseleave': this._hideCursor.bind(this),
            'mousemove': this._moveCursor.bind(this)
        })

        window.Commands.on('reset-canvas', () => {
            Ticker.reset()
            Ticker.stop()
            this.displacePass.reset()
            this.renderPass.render()
        })

        window.Commands.on('save-canvas', () => {
            this.saveAsImage()
        })

        window.Commands.on('load-source', this._loadSource.bind(this))
    }

    //----------------------------------------
    // public

    changeEffect(fragmentShader, uniforms) {
        this.displacePass.changeProgram(fragmentShader, uniforms)
    }

    updateUniforms(_uniforms) {
        let uniforms = this.displacePass.uniforms

        for (let key in _uniforms) {
            if (uniforms[key].type.search(/f|i/) != -1) {
                uniforms[key].value = _uniforms[key].value
            } else if (uniforms[key].type.search('v2') != -1) {
                uniforms[key].value.x = _uniforms[key].value.x
                uniforms[key].value.y = _uniforms[key].value.y
            } else if (uniforms[key].type.search('v3') != -1) {
                uniforms[key].value.x = _uniforms[key].value.x
                uniforms[key].value.y = _uniforms[key].value.y
                uniforms[key].value.z = _uniforms[key].value.z
            }
        }
    }

    //----------------------------------------
    // private

    _loadSource(src) {

        if (typeof src == 'string') {

            this._setSourceURL(src)

        } else {
            console.log('detected as file')

            let reader = new FileReader()

            reader.addEventListener('load', () => {
                console.log('loaded!!!!')
                this._setSourceURL(reader.result)
            })

            reader.readAsDataURL(src)
        }
    }

    _setSourceURL(url) {
        let img = new Image()
        img.src = url
        img.onload = () => {
            this.textureLoader.load(url, (tex) => {
                Ticker.reset()
                this._setResolution(img.width, img.height)
                this.displacePass.reset(tex)
                this.renderPass.render()
            })
        }

    }

    _update() {
        this.displacePass.render()
        this.renderPass.render()
    }

    _updateTransform() {
        let sw = this.$wrapper.width() / this.width
        let sh = this.$wrapper.height() / this.height

        let scale = Math.min(sw, sh)
        let x = (this.$wrapper.width() - this.width * scale) / 2
        let y = (this.$wrapper.height() - this.height * scale) / 2

        this.$canvas.css({x, y, scale})
    }

    _setResolution(w, h) {
        this.width = w
        this.height = h
        this.displacePass.setSize(this.width, this.height)
        window.renderer.setSize(this.width, this.height)

        this._updateTransform()
    }

    //----------------------------------------
    // event

    _showCursor() {
        this.$cursor.addClass('show')
    }

    _hideCursor() {
        this.$cursor.removeClass('show')
    }

    _moveCursor(e) {
        this.$cursor.css({
            x: e.pageX - this.$easel[0].offsetLeft,
            y: e.pageY - this.$easel[0].offsetTop
        })
    }

    //----------------------------------------
    // public

    changeProgram(code) {
        this.displacePass.changeProgram(code)
    }

    saveAsImage() {
        this.$canvas[0].toBlob((blob) => {
            FileSaver.saveAs(blob, `image${Ticker.frame}.png`)
        })
    }

    setOriginalTexture(tex) {
        this.originalTexture = tex
        this._setResolution(tex.image.width, tex.image.height)
        this.displacePass.reset(this.originalTexture)
    }
}