// sessionStorage is isolated per tab — fixes the multi-tab login conflict
const S = sessionStorage

export const saveAuth = (token, role, email, userId, name) => {
  S.setItem('token',  token)
  S.setItem('role',   role)
  S.setItem('email',  email)
  if (userId) S.setItem('userId', String(userId))
  if (name)   S.setItem('name',   name)
}

export const getToken  = () => S.getItem('token')
export const getRole   = () => S.getItem('role')
export const getEmail  = () => S.getItem('email')
export const getUserId = () => S.getItem('userId')
export const getName   = () => S.getItem('name')

export const logout = () => {
  ['token','role','email','userId','name'].forEach(k => S.removeItem(k))
}