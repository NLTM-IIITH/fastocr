from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate, login
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.db.models import Count
from django.shortcuts import redirect, render
from django.urls import reverse_lazy
from django.views.generic import DetailView, TemplateView, UpdateView

from .forms import SignUpForm, UserUpdateForm
from .models import User


class BaseUserView(LoginRequiredMixin):
	model = User
	navigation = 'user'


# class UserStatsView(BaseUserView, TemplateView):
# 	template_name = 'user/stats.html'

# 	def get_context_data(self, **kwargs):
# 		pages = self.request.user.pages.all().exclude(status__in=['new', 'segmented']) # type: ignore
# 		ret = {'total': pages.count()}
# 		pages = pages.values('status').annotate(count=Count('id'))
# 		for i in pages:
# 			ret[i['status']] = int(i['count'])
# 		kwargs.update(**ret)
# 		return super().get_context_data(**kwargs)
	


# class UserUpdateView(UserPassesTestMixin, BaseUserView, UpdateView):
# 	form_class = UserUpdateForm
# 	template_name = 'user/user_update.html'
# 	success_url = reverse_lazy('core:index')

# 	def test_func(self):
# 		"""
# 		This view will only be accessible either to the staff members
# 		or if the logged in person is requesting his/her own profile
# 		"""
# 		return self.get_object() == self.request.user or \
# 			self.request.user.is_staff # type: ignore


def register(request):
	print('request received inside register')
	if request.method == 'POST':
		print(request.POST)
		form = SignUpForm(request.POST)
		if form.is_valid():
			print('form valid')
			form.save()
			# username = form.cleaned_data.get('username')
			# raw_password = form.cleaned_data.get('password1')
			# user = authenticate(username=username, password=raw_password)
			# login(request, user)
			return redirect('core:index')
	else:
		form = SignUpForm()
	return render(request, 'registration/register.html', {'form': form})


# class UnassignView(UserPassesTestMixin, BaseUserView, DetailView):

# 	def test_func(self):
# 		"""
# 		This view will only be accessible to the staff members
# 		"""
# 		return self.request.user.is_staff # type: ignore

# 	def get(self, *args, **kwargs):
# 		user = self.get_object()
# 		messages.success(
# 			self.request,
# 			f'Unassigned {user.pages.assigned().count()} pages for {user.username}' # type: ignore
# 		)
# 		user.unassign() # type: ignore
# 		return redirect('stats:user')