import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function recreateUser() {
  const email = 'qualifys.app@gmail.com'
  const password = 'carvalho159'
  
  console.log(`Deletando o usuário ${email} para recriar de forma limpa...`)
  
  const { data, error } = await supabase.auth.admin.listUsers()
  
  const user = data?.users.find(u => u.email === email)
  
  if (user) {
    console.log(`Deletando usuário antigo (ID: ${user.id})...`)
    await supabase.auth.admin.deleteUser(user.id)
  }
  
  console.log(`Criando usuário do zero...`)
  const { data: newData, error: createError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  })
  
  if (createError) {
    console.error("Erro ao criar usuário:", createError.message)
    return
  }
  
  const newUserId = newData.user.id
  console.log(`Usuário criado! (ID: ${newUserId})`)
  
  console.log(`Atribuindo Super Admin...`)
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert([{ user_id: newUserId, role: 'superadmin' }])
    
  if (roleError) {
    console.error("Erro ao atribuir role:", roleError.message)
  } else {
    console.log("✅ Tudo pronto! Usuário criado, confirmado e promovido a Super Admin!")
  }
}

recreateUser()
