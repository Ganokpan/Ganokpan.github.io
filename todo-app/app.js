
const todoForm = document.querySelector('form');
const todoInput = document.querySelector('#todo-input');
const todoListUL = document.querySelector('#todo-list');
const remainingTodo = document.querySelector('.remain'); console.log(remainingTodo);
const getTodos = () => {
    const todos = localStorage.getItem("todos") || "[]";
    console.log(todos);
    return JSON.parse(todos);
}
const createTodoItem = (todoObj, todoIndex) => {
    const todoId = "todo-" + todoIndex;
    const todoList = document.createElement("li");
    const todoText = todoObj.text;
    todoList.className = "todo-item";
    todoList.innerHTML = `
          <input type="checkbox" id="${todoId}"/>
          <label for="${todoId}" class="todo-text">${todoText}</label>
          <button class="delete-button">
            <span class="material-symbols-outlined delete-icon"> close_small </span>
          </button>
        `
    const checkbox = todoList.querySelector("input");
    checkbox.addEventListener("change", () => {
        allTodos[todoIndex].completed = checkbox.checked;
        console.log(allTodos);
        displayRemainingTodo();
    })
    const deleteButton = todoList.querySelector(".delete-button");
    deleteButton.addEventListener("click", () => {
        deleteTodoItem(todoIndex);
        console.log('deleted works');
        displayRemainingTodo();
    })
    return todoList;

}
let allTodos = getTodos();
//แสดงผลจำนวนรายที่ยังไม่ทำ
const displayRemainingTodo = () => {
    const remaining = allTodos.filter((todoObj) =>
        !todoObj.completed);
    console.log(displayRemainingTodo.length);
    remainingTodo.innerHTML = remaining.length;

}
displayRemainingTodo();
const updateTodoList = () => {
    todoListUL.innerHTML = "";
    allTodos.forEach((todoObj, todoIndex) => {
        todoItem = createTodoItem(todoObj, todoIndex);
        todoListUL.append(todoItem);
    })
}
updateTodoList();




//เพิ่ม todo
const addTodo = () => {
    const todoText = todoInput.value.trim();
    if (todoText.length > 0) {
        const todoObject = {
            text: todoText,
            completed: false
        }
        allTodos.push(todoObject);
        updateTodoList();
        saveTodos();
        displayRemainingTodo();
        console.log(allTodos);
        todoInput.value = "";
    }
}

todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTodo();
})



//update รายการ


//ลบรายการ
const deleteTodoItem = (todoIndex) => {
    allTodos = allTodos.filter((_, i) => i !== todoIndex);
    saveTodos();
    updateTodoList();
}
const saveTodos = () => {
    const todosJson = JSON.stringify(allTodos);
    localStorage.setItem('todos', todosJson);
}


