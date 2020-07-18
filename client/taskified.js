
function maketodo() {
    return {
        original: 'yark',
        rendered: marked('yark'),
        editable: false,
        selected: false,
        uid: Math.random().toString(36).substring(2, 15)
    }
}

var app = new Vue({
    el: '#app',
    data: {
        todos: [
            maketodo()
        ],
        activeElement: null,
    },
    methods: {
        getTodoFromIdx(i) {
            var last = null
            var first = null
            if (this.todos.length > 0) {
                first = this.todos[0]
                last = this.todos[this.todos.length - 1]
            }

            if (i < 0) {
                return first
            }

            if (i >= this.todos.length) {
                return last
            }

            return this.todos[i]
        },

        getActiveIdx(todo) {
            for (var i = 0; i < this.todos.length; ++i) {
                if (this.todos[i] == todo) {
                    return i;
                }
            }
        },

        handleItemClick(todo) {
            this.todos.forEach((todo) => todo.selected = false)

            todo.selected = true

            this.activeElement = todo
        },

        handleEditorKey(todo, event) {
            var ta = this.$refs['textareas_' + todo.uid][0]

            if (event.key == "Enter" && event.ctrlKey) {
                todo.original = ta.value
                todo.rendered = marked(ta.value)
                todo.editable = false

                Vue.nextTick(
                    () => {
                        var badge = this.$refs['badges_' + todo.uid][0]
                    }
                )

                event.stopPropagation()
                event.preventDefault()
            }
        },

        handleGlobalKey(x) {
            if (this.activeElement && this.activeElement.editable) {
                return
            }

            var todo = this.activeElement

            switch (x.key) {
            case 'Enter':
                todo.editable = true
                x.preventDefault()
                Vue.nextTick(
                    () => {
                        var ta = this.$refs['textareas_' + this.activeElement.uid][0]
                        ta.value = todo.original
                        ta.focus()
                    }
                )
                break

            case 'ArrowDown':
                var idx = this.getActiveIdx(todo)
                var newtodo = this.getTodoFromIdx(idx + 1)

                if (newtodo) {
                    this.handleItemClick(newtodo)
                }
                break

            case 'ArrowUp':
                var idx = this.getActiveIdx(todo)
                var newtodo = this.getTodoFromIdx(idx - 1)

                if (newtodo) {
                    this.handleItemClick(newtodo)
                }
                break

            case 'x':
                this.todos.push(maketodo())
                break
            }
        }
    }
})
