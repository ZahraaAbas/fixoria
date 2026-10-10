// الساكن يستخدم خدمات المجمع بعد موافقة إدارته، وإذا المجمع فعّال
export function isApprovedResident(user) {
  return user?.role === 'resident' && user.membershipStatus === 'approved' && user.compoundActive !== false
}
