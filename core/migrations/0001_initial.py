# Generated by Django 4.2.3 on 2023-08-22 06:52

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Page',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='images')),
                ('version', models.CharField(default='v4', max_length=40)),
                ('language', models.CharField(choices=[('', 'Select Language'), ('assamese', 'Assamese'), ('bengali', 'Bengali'), ('english', 'English'), ('gujarati', 'Gujarati'), ('hindi', 'Hindi'), ('kannada', 'Kannada'), ('malayalam', 'Malayalam'), ('manipuri', 'Manipuri'), ('marathi', 'Marathi'), ('oriya', 'Oriya'), ('punjabi', 'Punjabi'), ('tamil', 'Tamil'), ('telugu', 'Telugu'), ('urdu', 'Urdu')], default='', max_length=20)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('modified', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pages', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
