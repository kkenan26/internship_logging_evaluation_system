from rest_framework import serializers
from .models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 
                  'email', 'role', 'first_name', 
                  'last_name']
        
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type':'password'})
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type':'password'})

    class Meta:
        model = CustomUser
        fields = ['username','email','password','password2','role','first_name','last_name','phone_number']

    def validate(self, data):
        if data['password']!= data['password2']:
            raise serializers.ValidationError({"password":"Password fields didn't match."})
        return data
    def create(self, validated_data):
        validated_data.pop('password2')
        user = CustomUser.objects.create_user(**validated_data)
        return user