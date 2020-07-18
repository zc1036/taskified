
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
        getSelectedTodos() {
            return this.todos.filter(todo => todo.selected)
        },

        saveState() {
            window.localStorage.setItem('todos', JSON.stringify(this.todos))
            window.localStorage.setItem('deletedtodos', JSON.stringify(this.deletedTodos))
        },

        loadStateFromLocalStorage() {
            var todos = window.localStorage.getItem('todos')

            if (todos) {
                this.todos = JSON.parse(todos)
            }

            var deletedTodos = window.localStorage.getItem('deletedtodos')

            if (deletedTodos) {
                this.deletedTodos = JSON.parse(deletedTodos)
            }

            this.postLoadState()
        },

        postLoadState() {
            this.clearSelection()
        },

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
        },

        clearSelection() {
            this.todos.forEach((todo) => todo.selected = false)
        },

        handleItemClick(todo, shiftKey) {
            if (!shiftKey) {
                this.clearSelection()
            }

            todo.selected = true

            Vue.nextTick(() =>
                         this.$refs['badges_' + todo.uid][0].scrollIntoView({block: 'nearest'}))
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
            switch (event.key) {
            case 's':
                if (event.ctrlKey) {
                    this.saveState()
                    break
                }

                this.activeContexts.push((e) => this.handleStatusKey(e))
                this.activeStatusShortcuts = this.setTodoStateShortcuts
                event.preventDefault()
                event.stopPropagation()
                break

            case 'Enter':
                var todos = this.getSelectedTodos()
                todos.forEach(todo => todo.editable = true)
                event.preventDefault()

                Vue.nextTick(
                    () =>
                        todos.forEach(todo => {
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
                        })
                )

                break

            case 'G':
                var lasttodo = this.getTodoFromIdx(this.todos.length)
                if (lasttodo) {
                    this.handleItemClick(lasttodo)
                }
                
                break

            case 'g':
                if (!event.ctrlKey) {
                    var firsttodo = this.getTodoFromIdx(0)

                    if (firsttodo) {
                        this.handleItemClick(firsttodo)
                    }
                    break
                }
                // fallthrough

            case 'Escape':
                this.getSelectedTodos().forEach(todo => todo.selected = false)
                break

            case 'n':
            case 'N':
            case 'ArrowDown':
                if (this.todos.length > 0) {
                    var selected = this.getSelectedTodos()
                    var idx = this.getTodoIdx(selected[selected.length - 1])
                    var newtodo = this.getTodoFromIdx(idx + 1)

                    if (newtodo) {
                        this.handleItemClick(newtodo, event.shiftKey)
                    }
                }
                break

            case 'P':
            case 'p':
            case 'ArrowUp':
                if (this.todos.length > 0) {
                    var selected = this.getSelectedTodos()
                    var idx = this.getTodoIdx(selected[0])
                    var newtodo = this.getTodoFromIdx(idx - 1)

                    if (newtodo) {
                        this.handleItemClick(newtodo, event.shiftKey)
                    }
                }
                break

            case 'k':
                var selected = this.getSelectedTodos()

                if (selected.length) {
                    var lasttodo = selected[selected.length - 1]
                    var lastidx = this.getTodoIdx(lasttodo)
                    
                    var deleted = selected.map(
                        todo => {
                            var idx = this.getTodoIdx(todo)
                            this.deleteTodo(todo)
                            return { todo: todo, idx: idx }
                        }
                    )

                    this.deletedTodos.push(deleted)

                    var newtodo = this.getTodoFromIdx(lastidx)

                    if (newtodo) {
                        this.handleItemClick(newtodo)
                    }
                }

                break

            case 'u':
                var pkg = this.deletedTodos.pop()

                if (pkg) {
                    this.clearSelection()

                    pkg.forEach(
                        old => {
                            this.todos.splice(old.idx, 0, old.todo)
                            this.handleItemClick(old.todo, true)
                        }
                    )
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
        this.loadStateFromLocalStorage()
    }
})
