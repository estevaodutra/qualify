-- Migration: Save API4COM Tokens and Extensions for all existing users
-- Ensures all 7 platform users have active tokens and assigned SIP extensions

UPDATE public.profiles
SET
  api4com_token = 'fSENJOSmNIi6FzGKLZcCr2SBSAuzlAcaLxoiXySZi09QJpwMYvFkg595g9j8wt5T',
  api4com_extension = '1007',
  api4com_domain = 'd2x.api4com.com',
  api4com_password = 'carvalho159',
  api4com_synced_at = NOW()
WHERE lower(email) = 'percursodavida@gmail.com';

UPDATE public.profiles
SET
  api4com_token = 'LAGQib0NXaNk3m9Ia46tFGkxQnaDcCEw2B7fGstVvLAORBSOIH2ElmPzhFhcVaIS',
  api4com_extension = '1008',
  api4com_domain = 'd2x.api4com.com',
  api4com_password = 'carvalho159',
  api4com_synced_at = NOW()
WHERE lower(email) = 'flavia.bortolazo@gmail.com';

UPDATE public.profiles
SET
  api4com_token = 'Q2VgGr6VIY2wzvayFlliLRIBX8av8xLGVaS52nRFq1sfChuvp6u3LVuSvLzzJEEX',
  api4com_extension = '1009',
  api4com_domain = 'd2x.api4com.com',
  api4com_password = 'carvalho159',
  api4com_synced_at = NOW()
WHERE lower(email) = 'fla_bortolazo@hotmail.com';

UPDATE public.profiles
SET
  api4com_token = 'QO45gsVOywSoI5e6hfnZToB5kAu6TI1Cax6Hio9JDslHp1BlHCJ07c2CeNKt0FPi',
  api4com_extension = '1010',
  api4com_domain = 'd2x.api4com.com',
  api4com_password = 'carvalho159',
  api4com_synced_at = NOW()
WHERE lower(email) = 'pablosantanasantos@gmail.com';

UPDATE public.profiles
SET
  api4com_token = 'Yoj5Dzz8PfeUFDE693zUqLtStF5L6vx19lD5JT4Hcl0dCXcCW9FAehGKv4CXje6U',
  api4com_extension = '1003',
  api4com_domain = 'd2x.api4com.com',
  api4com_password = 'carvalho159',
  api4com_synced_at = NOW()
WHERE lower(email) = 'maurodutra3@gmail.com';

UPDATE public.profiles
SET
  api4com_token = 'gVmB296Z0xkuz72fDEbjgHItErKiLZIHnsGL52d7sZ3yfAZUSYs4Jyx3lJoET0I4',
  api4com_extension = '1011',
  api4com_domain = 'd2x.api4com.com',
  api4com_password = 'carvalho159',
  api4com_synced_at = NOW()
WHERE lower(email) = 'qualifys.app@gmail.com';

UPDATE public.profiles
SET
  api4com_token = 'Ul0loTUVUhENQrHoTYI2Bs87hHxHCnNeTLHG2ibFDrduZTpKPiUZFRgiZYYYAL4A',
  api4com_extension = '1002',
  api4com_domain = 'd2x.api4com.com',
  api4com_password = 'carvalho159',
  api4com_synced_at = NOW()
WHERE lower(email) = 'estevaodutra.pmss@gmail.com';

-- Sync call_operators table for any operator records corresponding to these users
UPDATE public.call_operators co
SET
  api4com_token = p.api4com_token,
  extension = p.api4com_extension,
  sip_domain = p.api4com_domain,
  sip_password = p.api4com_password,
  updated_at = NOW()
FROM public.profiles p
WHERE co.user_id = p.id
  AND p.api4com_token IS NOT NULL;
