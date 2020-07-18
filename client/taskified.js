
function sanitizeHtml(text) {
    var div = document.createElement('div')
    div.innerText = text
    return div.innerHTML.replace(/<br>/g, '\n')
}

function markdown(text) {
    return marked(sanitizeHtml(text))
}

function formatDate(date) {
    var today = new Date()

    var td = new Date(
        date.year,
        date.month,
        date.day,
        date.hour,
        date.minute
    )

    if (td.getFullYear() == today.getFullYear()) {
        if (td.getMonth() == today.getMonth()
            && td.getDate() == today.getDate())
        {
            var hour = date.hour % 12
            var ampm = date.hour >= 12 ? 'pm' : 'am';

            if (hour == 0) {
                hour = '12'
            }
            return '' + hour + ':' + (date.minute.toString().padStart(2, '0')) + ' ' + ampm
        } else if (td.getDate() == today.getDate() - 1) {
            return 'yesterday'
        } else if (td.getMonth() == today.getMonth() &&
                   today.getDate() - td.getDate() < 7)
        {
            return td.toLocaleString('en-us', { weekday: 'long' })
        } else {
            return td.getMonth() + '/' + td.getMonth()
        }
    }
    
    return '' + (date.month + 1) + '/' + date.day + '/' + date.year
}

function setDate(todo, date) {
    todo.date = {
        minute: date.getMinutes(),
        hour: date.getHours(),
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear()
    }
    todo.formattedDate = formatDate(todo.date)
}

function maketodo() {
    var date = new Date()

    var todo = {
        status: '',
        original: 'yark',
        rendered: markdown('yark'),
        editable: false,
        selected: false,
        uid: Math.random().toString(36).substring(2, 15)
    }

    setDate(todo, date)

    return todo
}

function setTodoStatus(a) {
    this.activeElement.status = a.text
}

var app = new Vue({
    el: '#app-container',
    data: {
        todos: [ ],
        deletedTodos: [ ],
        activeElement: null,
        activeStatusShortcuts: [ ],
        setTodoStateShortcuts: [
            { shortcut: 'c',
              text: '✓',
              action: setTodoStatus },
            { shortcut: 't',
              text: '☐',
              action: setTodoStatus },
            { shortcut: 'T',
              text: '☑',
              action: setTodoStatus },
            { shortcut: 'n',
              text: '',
              pretty: '[clear]',
              action: setTodoStatus },
            { shortcut: 'f',
              text: '⮕',
              action: setTodoStatus },
            { shortcut: 'b',
              text: '⇨',
              action: setTodoStatus }
        ],
        activeContexts: [ ]
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

        getTodoIdx(todo) {
            for (var i = 0; i < this.todos.length; ++i) {
                if (this.todos[i] == todo) {
                    return i;
                }
            }
            return 0;
        },

        deleteTodo(todo) {
            todo.selected = false
            var idx = this.getTodoIdx(todo)

            this.todos.splice(idx, 1)

            if (this.activeElement == todo) {
                this.activeElement = null
            }
        },

        handleItemClick(todo) {
            this.todos.forEach((todo) => todo.selected = false)

            todo.selected = true

            this.activeElement = todo
        },

        handleEditorKey(todo, ed, event) {
            var ta = this.$refs['textareas_' + todo.uid][0]

            if (event.key == "Enter" && event.ctrlKey) {
                todo.original = ed.value()
                todo.rendered = markdown(todo.original)
                ed.toTextArea()
                todo.editable = false

                event.stopPropagation()
                event.preventDefault()
            }
        },

        handleGlobalKey(event) {
            this.activeContexts[this.activeContexts.length - 1](event)
        },

        cancelStatusCapture() {
            this.activeStatusShortcuts = []
            this.activeContexts.pop()
        },

        handleStatusKey(event) {
            if (event.key == 'Escape'
                || (event.key == 'g' && event.ctrlKey))
            {
                this.cancelStatusCapture()
                return
            }

            selection = event.key

            if (event.shiftKey) {
                selection = selection.toUpperCase()
            }

            for (var i = 0; i < this.activeStatusShortcuts.length; ++i) {
                var sc = this.activeStatusShortcuts[i]

                if (sc.shortcut == event.key) {
                    sc.action.call(this, sc)
                    this.cancelStatusCapture()
                    return
                }
            }
        },

        handleTodoKey(event) {
            if (this.activeElement && this.activeElement.editable) {
                return
            }

            var todo = this.activeElement

            switch (event.key) {
            case 's':
                if (!this.activeElement) {
                    break
                }
                this.activeContexts.push((e) => this.handleStatusKey(e))
                this.activeStatusShortcuts = this.setTodoStateShortcuts
                event.preventDefault()
                event.stopPropagation()
                break

            case 'Enter':
                if (!todo) return;
                todo.editable = true
                event.preventDefault()

                Vue.nextTick(
                    () => {
                        var ta = this.$refs['textareas_' + this.activeElement.uid][0]
                        var ed = new SimpleMDE({ element: ta,
                                                 shortcuts: { },
                                                 initialValue: todo.original,
                                                 autofocus: true,
                                                 toolbar: false,
                                                 spellChecker: false,
                                                 status: false })
                        ed.codemirror.on('keydown', (mirror, e) => {
                            this.handleEditorKey(todo, ed, e)
                        })
                    }
                )

                break

            case 'g':
                if (!event.ctrlKey) {
                    break
                }

            case 'Escape':
                if (this.activeElement) {
                    this.activeElement.selected = false
                    this.activeElement = null
                }
                break

            case 'n':
            case 'ArrowDown':
                var idx = this.getTodoIdx(todo)
                var newtodo = this.getTodoFromIdx(idx + 1)

                if (newtodo) {
                    this.handleItemClick(newtodo)
                }
                break

            case 'p':
            case 'ArrowUp':
                var idx = this.getTodoIdx(todo)
                var newtodo = this.getTodoFromIdx(idx - 1)

                if (newtodo) {
                    this.handleItemClick(newtodo)
                }
                break

            case 'k':
                if (this.activeElement) {
                    var idx = this.getTodoIdx(this.activeElement)
                    this.deletedTodos.push({ todo: this.activeElement, idx: idx })
                    this.deleteTodo(this.activeElement)
                    var newtodo = this.getTodoFromIdx(idx)
                    if (newtodo) {
                        this.handleItemClick(newtodo)
                    } 
                }
                break

            case 'u':
                var old = this.deletedTodos.pop()

                if (old) {
                    this.todos.splice(old.idx, 0, old.todo)
                    this.handleItemClick(old.todo)
                }
                break

            case 'x':
                this.todos.push(maketodo())
                break
            }
        }
    },
    mounted() {
        console.log('yes')
        window.addEventListener('keydown', (e) => this.handleGlobalKey(e))
        this.activeContexts.push((e) => this.handleTodoKey(e))
    }
})
