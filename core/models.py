from os.path import basename, splitext

from django.db import models
from django.urls import reverse_lazy


class Page(models.Model):
    LANGUAGE_CHOICES = (
        ('', 'Select Language'),
        ('assamese', 'Assamese'),
        ('bengali', 'Bengali'),
        ('english', 'English'),
        ('gujarati', 'Gujarati'),
        ('hindi', 'Hindi'),
        ('kannada', 'Kannada'),
        ('malayalam', 'Malayalam'),
        ('manipuri', 'Manipuri'),
        ('marathi', 'Marathi'),
        ('oriya', 'Oriya'),
        ('punjabi', 'Punjabi'),
        ('tamil', 'Tamil'),
        ('telugu', 'Telugu'),
        ('urdu', 'Urdu'),

        # # Extra languages
        # ('bodo', 'Bodo'),
        # ('dogri', 'Dogri'),
        # ('konkani', 'Konkani'),
        # ('kashmiri', 'Kashmiri'),
        # ('maithili', 'Maithili'),
        # ('nepali', 'Nepali'),
        # ('sindhi', 'Sindhi'),
        # ('santali', 'Santali'),
        # ('sanskrit', 'Sanskrit'),
    )

    image = models.ImageField(
        upload_to='images'
    )
    version = models.CharField(
        default='v4',
        max_length=40,
    )
    language = models.CharField(
        default='',
        max_length=20,
        choices=LANGUAGE_CHOICES
    )
    user = models.ForeignKey(
        "user.User",
        on_delete=models.CASCADE,
        related_name='pages',
    )

    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def get_absolute_url(self):
        return reverse_lazy("core:ocr", kwargs={"pk": self.pk})

    @property
    def filename(self) -> str:
        return splitext(basename(self.image.path))[0]
    